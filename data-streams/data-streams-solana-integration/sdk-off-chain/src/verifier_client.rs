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

#[derive(Debug)]
pub struct VerificationResult {
    pub signature: Signature,
    pub return_data: Option<Vec<u8>>,
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
        let verifier_client_data_account = VerifierInstructions::get_verifier_config_pda(
            &program_id
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
        let config_account = VerifierInstructions::get_config_pda(&signed_report, &self.program_id);

        // Compress the report before sending. Obtain this off-chain from the data streams server
        let mut encoder = Encoder::new();
        let compressed_report = encoder.compress_vec(&*signed_report).expect("Compression failed");

        let instruction = VerifierInstructions::verify(
            &self.program_id,
            &self.verifier_client_data_account,
            &self.access_controller_data_account,
            &self.payer.pubkey(),
            &config_account,
            compressed_report
        );

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
