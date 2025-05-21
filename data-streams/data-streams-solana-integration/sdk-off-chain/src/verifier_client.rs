use base64::{ engine::general_purpose, Engine as _ };
use chainlink_solana_data_streams::VerifierInstructions;
use solana_client::client_error::ClientError;
use solana_client::rpc_client::RpcClient;
use solana_client::rpc_config::RpcTransactionConfig;
use solana_sdk::{
    commitment_config::CommitmentConfig,
    instruction::Instruction,
    pubkey::Pubkey,
    signature::{ Keypair, Signature },
    signer::Signer,
    transaction::Transaction,
};
use snap::raw::Encoder;
use solana_transaction_status::{
    EncodedConfirmedTransactionWithStatusMeta,
    UiTransactionEncoding,
    UiTransactionReturnData,
};
use solana_pubkey::Pubkey as ChainlinkPubkey;

#[derive(Debug)]
pub struct VerificationResult {
    pub signature: Signature,
    pub return_data: Option<Vec<u8>>,
}

// Conversion function between Solana SDK Pubkey and Chainlink Pubkey
fn to_chainlink_pubkey(pubkey: &Pubkey) -> ChainlinkPubkey {
    let bytes = pubkey.to_bytes();
    ChainlinkPubkey::new_from_array(bytes)
}

fn from_chainlink_pubkey(pubkey: &ChainlinkPubkey) -> Pubkey {
    let bytes = pubkey.to_bytes();
    Pubkey::new_from_array(bytes)
}

pub struct VerificationClient {
    program_id: Pubkey,
    verifier_client_data_account: Pubkey,
    access_controller_data_account: Pubkey,
    rpc_client: RpcClient,
    payer: Keypair,
}

impl VerificationClient {
    pub fn new(
        program_id: Pubkey,
        access_controller_data_account: Pubkey,
        rpc_client: RpcClient,
        payer: Keypair
    ) -> Self {
        // Convert Solana Pubkey to Chainlink Pubkey for the SDK function
        let chainlink_program_id = to_chainlink_pubkey(&program_id);

        // Get verifier config PDA using the Chainlink SDK function
        let chainlink_verifier_client_data_account = VerifierInstructions::get_verifier_config_pda(
            &chainlink_program_id
        );

        // Convert back to Solana Pubkey
        let verifier_client_data_account = from_chainlink_pubkey(
            &chainlink_verifier_client_data_account
        );

        Self {
            program_id,
            verifier_client_data_account,
            access_controller_data_account,
            rpc_client,
            payer,
        }
    }

    pub fn verify(&self, signed_report: Vec<u8>) -> Result<VerificationResult, ClientError> {
        // Convert Solana Pubkey to Chainlink Pubkey
        let chainlink_program_id = to_chainlink_pubkey(&self.program_id);

        // Get config PDA using the Chainlink SDK function
        let chainlink_config_account = VerifierInstructions::get_config_pda(
            &signed_report,
            &chainlink_program_id
        );

        // Convert all Pubkeys to Chainlink Pubkeys for the SDK
        let chainlink_verifier_client_data_account = to_chainlink_pubkey(
            &self.verifier_client_data_account
        );
        let chainlink_access_controller_data_account = to_chainlink_pubkey(
            &self.access_controller_data_account
        );
        let chainlink_payer_pubkey = to_chainlink_pubkey(&self.payer.pubkey());

        // Compress the report before sending. Obtain this off-chain from the data streams server
        let mut encoder = Encoder::new();
        let compressed_report = encoder.compress_vec(&signed_report).expect("Compression failed");

        // Get the instruction from the Chainlink SDK
        let chainlink_instruction = VerifierInstructions::verify(
            &chainlink_program_id,
            &chainlink_verifier_client_data_account,
            &chainlink_access_controller_data_account,
            &chainlink_payer_pubkey,
            &chainlink_config_account,
            compressed_report
        );

        // Convert the Chainlink instruction to a Solana instruction
        let instruction = Instruction {
            program_id: self.program_id,
            accounts: chainlink_instruction.accounts
                .iter()
                .map(|acct| {
                    solana_sdk::instruction::AccountMeta {
                        pubkey: from_chainlink_pubkey(&acct.pubkey),
                        is_signer: acct.is_signer,
                        is_writable: acct.is_writable,
                    }
                })
                .collect(),
            data: chainlink_instruction.data,
        };

        self.send_transaction_and_get_return_data(&[instruction], &[&self.payer])
    }

    fn send_transaction_and_get_return_data(
        &self,
        instructions: &[Instruction],
        signers: &[&Keypair]
    ) -> Result<VerificationResult, ClientError> {
        let recent_blockhash = self.rpc_client.get_latest_blockhash()?;

        let mut transaction = Transaction::new_with_payer(instructions, Some(&self.payer.pubkey()));
        transaction.sign(signers, recent_blockhash);

        let signature = self.rpc_client.send_and_confirm_transaction(&transaction)?;
        let return_data = self.get_return_data(&signature)?;

        Ok(VerificationResult {
            signature,
            return_data,
        })
    }

    fn get_return_data(&self, signature: &Signature) -> Result<Option<Vec<u8>>, ClientError> {
        let transaction: EncodedConfirmedTransactionWithStatusMeta =
            self.rpc_client.get_transaction_with_config(signature, RpcTransactionConfig {
                encoding: Some(UiTransactionEncoding::Base64),
                commitment: Some(CommitmentConfig::confirmed()),
                max_supported_transaction_version: Some(0),
            })?;
        // Check if the return data is available
        if let Some(meta) = transaction.transaction.meta {
            // Explicitly convert OptionSerializer<UiTransactionReturnData> to Option<UiTransactionReturnData>
            let return_data_option: Option<UiTransactionReturnData> = meta.return_data.into();
            if let Some(return_data) = return_data_option {
                // The return data is Base64 encoded
                let data_base64 = return_data.data.0.clone();
                let data = general_purpose::STANDARD.decode(data_base64).unwrap();
                return Ok(Some(data));
            }
        }

        Ok(None)
    }
}
