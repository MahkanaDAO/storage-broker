import express from "express";
import * as microNodeRegistry from "./micro-node-registry";
import * as dealManager from "./storage-deal";
import { DateTime, Duration } from "luxon";
import * as utils from "./utils";
import { dataManager } from "./db";
import multer from "multer";

const app = express();
app.use(express.json());
const upload = multer();

const SECTOR_BYTE_SIZE = 512 * 1024 * 1024; // size of each sector in Bytes

app.post("/register-node", upload.none(), async (req, res) => {
    try {
        const { 
            address, 
            startTime, 
            endTime, 
            storageCapacity,
        } = req.body;
        await microNodeRegistry.activateNode(address);
        await dataManager.addNewProvider(address, startTime, endTime, parseInt(storageCapacity));
  
        res.status(201).send({ message: "successful registration!" });
    } catch (error) {
        console.error("unable to register node", error.stack);
        res.status(500).send(`unable to register node: ${error}`);
    }
});

app.post("/request-storage", upload.single("requested"), async (req, res) => {
    try {
        const {
            fromDate,
            toDate,
            userAddress,
            hourlySectorReward,
            totalFinalReward,
        } = req.body;
        const file = req.file;

        const sectorCount = Math.ceil(file.size / SECTOR_BYTE_SIZE);
        const dealDuration = utils.getDuration(fromDate, toDate);
        const assignedDailySchedule = await dataManager.selectProvidersForDeal(fromDate, toDate, sectorCount);

        // Deploy new storage deal on chain.
        const dealAddress = await dealManager.deploy(
            userAddress,
            dealDuration,
            parseInt(hourlySectorReward),
            parseInt(totalFinalReward),
            assignedDailySchedule,
            process.env.VERIFIER_ADDRESS,
            "",
        );

        const sectorLinks = await utils.splitFile(file);
        await dataManager.saveNewStorageDeal(dealAddress, userAddress, fromDate, toDate, sectorLinks);

        res.status(201).send({ message: "Data added in DB temporarily" });
    } catch (error) {
        console.error("unable to process storage request:", error);
        res.status(500).send(`unable to process storage request: ${error}`);
    }
});

app.get("/sector-data", async (req, res) => {
    const { deal: dealAddress, provider: providerAddress } = req.query;

    // try {
    //     const sectorLinks = await dataManager.getSectorLinks(dealAddress, providerAddress);
    //     const files = await fetchSectors(sectorLinks);
    //     res.status(200).json({ files });
    // } catch (error) {
    //     console.error(`unable to get sector data for provider ${providerAddress} in deal ${dealAddress}:`, error);
    //     res.status(500).send("Error getting nodes");
    // }
});
  
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`API listening on port ${port}`));
