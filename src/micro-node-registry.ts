import { ethers } from "ethers";
import { HYPERSPACE_RPC_URL, REGISTRY_ADDRESS, REGISTRY_ABI } from "./constants";
import { channels } from "@pushprotocol/restapi";

const provider =  new ethers.providers.JsonRpcProvider(HYPERSPACE_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, wallet);

async function activateNode(address: string) {
    try {
        await registry.activateNode(address);
        console.log(`Node with address ${address} activated successfully`);
    }
    catch (error) {
        throw new Error("unable to activate node");
    }
}


async function getRating(address: string) {
    return await registry.getRating(address);
}

async function getWeightedRating(address: string) {
    const [rating, weight] = await Promise.all([
        registry.getRating(address),
        registry.getFulfilledHours(address),
    ]);
    return rating * weight;
}

export {
    activateNode,
    getRating,
    getWeightedRating,
};