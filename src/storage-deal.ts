import { Contract, ethers } from "ethers";
import * as PushAPI from "@pushprotocol/restapi";
import { HYPERSPACE_RPC_URL, DEAL_ABI, DEAL_BYTECODE } from "./constants";

const PK = "589e4d13ab5d2870644b1cbf94390df214da0ee9fc729362bc3238c6c776afa9";
const Pkey = `0x${PK}`;
const signer = new ethers.Wallet(Pkey);

const sendNotification = async(node, body) => {
    try {
      const apiResponse = await PushAPI.payloads.sendNotification({
        signer,
        type: 3, // target
        identityType: 2, // direct payload
        notification: {
          title: `Deal Incoming`,
          body: `You have a new deal!`
        },
        payload: {
          title: "Deal Incoming",
          body: body,
          cta: '',
          img: ''
        },
        channel: 'eip155:5:0x9aAab7605F4a7E687d8706474ab867284859A0d3', // channel address
        recipients: `eip155:5:${node}`, // recipient address
        env: 'staging'
      });
      
      // apiResponse?.status === 204, if sent successfully!
      console.log('API repsonse: ', apiResponse);
    } catch (err) {
      console.error('Error: ', err);
    }
  }

async function deploy(
    userAddress: string, 
    dealDuration: number,
    hourlySegmentReward: number, 
    totalFinalReward: number,
    dailySchedule: string[][],
    verifier: string,
    poRep: string,
): Promise<string> {
    const provider =  new ethers.providers.JsonRpcProvider(HYPERSPACE_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    console.log("wallet")
    const StorageDeal = new ethers.ContractFactory(DEAL_ABI, DEAL_BYTECODE, wallet);
    console.log("here");
    const contract = await StorageDeal.deploy(
        userAddress, 
        dealDuration,
        hourlySegmentReward, 
        totalFinalReward,
        dailySchedule,
        verifier,
        poRep,
    );
    console.log("res");

    // const body = ```User: ${userAddress}\nDeal Duration: ${dealDuration}\nHourly Segment Reward ${hourlySegmentReward}\nTotal Final Reward ${totalFinalReward}```

    // chosenNodes.forEach(node => sendNotification(node, body))

    return contract.address;
}

// TODO move to portal code
async function startDeal(address: string, rewards: number) {
    const provider = new ethers.providers.JsonRpcProvider(HYPERSPACE_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const deal = new ethers.Contract(address, DEAL_ABI, wallet);

    console.log(await deal.startDeal({ value: rewards}));
}

// async function getDealStatus(address) {
//     const provider = new ethers.providers.JsonRpcProvider(HYPERSPACE_RPC_URL);
//     const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
//     const deal = new ethers.Contract(address, DEAL_ABI, wallet);

//     const hour = await deal.getCurrHour();
//     const day = await deal.getCurrDay();
//     console.log(hour, day);

//     const address = await deal.proofHistory();
//     const ProofHistory = await ethers.getContractFactory("ProofHistory");
//     const history = await ProofHistory.attach(address);

//     const workLog = await deal.participants(node1.address);
//     expect(workLog.isParticipant).to.be.true;
//     expect(workLog.fulfillments).to.equal(1);
//     expect(workLog.commitments).to.equal(120);
// }

export {
    deploy,
    startDeal,
    // getDealStatus,
};