import { FastifyInstance, util } from "@chainlink/ea-bootstrap";
import { AdapterRequest } from "@chainlink/types";
import { AddressInfo } from "net";
import nock from "nock";
import request, { SuperTest, Test } from "supertest";
import { server as startServer } from "../../src";

describe("execute", () => {
  const id = util.uuid();
  let fastify: FastifyInstance;
  let req: SuperTest<Test>;
  let oldEnv: NodeJS.ProcessEnv;

  beforeAll(async () => {
    oldEnv = JSON.parse(JSON.stringify(process.env));

    process.env.CACHE_ENABLED = "false";
    if (process.env.RECORD) {
      nock.recorder.rec();
    }
    fastify = await startServer();
    req = request(
      `localhost:${(fastify.server.address() as AddressInfo).port}`
    );
  });

  afterAll((done) => {
    process.env = oldEnv;

    if (process.env.RECORD) {
      nock.recorder.play();
    }

    nock.restore();
    nock.cleanAll();
    nock.enableNetConnect();
    fastify.close(done);
  });

  describe("ticker-coin api", () => {
    const data: AdapterRequest = {
      id,
      data: { endpoint: "ticker-coin", coinid: "btc-bitcoin", quote: "EUR" },
    };

    it("should return success", async () => {
      //mockPriceSuccess();

      const response = await req
        .post("/")
        .send(data)
        .set("Accept", "*/*")
        .set("Content-Type", "application/json")
        .expect("Content-Type", /json/)
        .expect(200);
      expect(response.body.jobRunID).toMatchSnapshot(id);
    });
  });
});
