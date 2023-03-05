import { MongoClient, Collection, Document } from "mongodb";
import { ethers } from "ethers";
import { DateTime, DurationLikeObject, Interval } from "luxon";

const DEFAULT_RATING = 90;

interface Provider {
    address: string;
    startTime: Date;
    endTime: Date;
    isAvailable: boolean;
    storageCapacity: number;
    weightedRating: number;
    storageDeals: string[];
}

enum StorageSize {
    TWO = 2,
    FOUR = 4,
    EIGHT = 8,
    SIXTEEN = 16,
    THIRTY_TWO = 32,
    SIXTY_FOUR = 64,
}

class DataManagerFactory {
    static async create(): Promise<DataManager> {
        const client = new MongoClient(process.env.DB_URI);
    
        try {
            await client.connect();
            console.log("Connected to MongoDB");
            const db = client.db("mahkana");
            const providers = db.collection("providers");
            const requesters = db.collection("requesters");
            const storageDeals = db.collection("storageDeals");

            return new DataManager(providers, requesters, storageDeals);
        } catch (error) {
            console.error(`Error connecting to database: ${error.stack}`);
        }

        return new Promise((resolve, _) => resolve(null));
    }
}

class DataManager {

    private providers: Collection<Document>;
    private requesters: Collection<Document>;
    private storageDeals: Collection<Document>;

    constructor(
        providers: Collection<Document>, 
        requesters: Collection<Document>, 
        storageDeals: Collection<Document>,
    ) {
        this.providers = providers;
        this.requesters = requesters;
        this.storageDeals = storageDeals;
    }

    async addNewProvider(
        address: string, 
        startTime: string, 
        endTime: string, 
        storageCapacity: number,
    ): Promise<void> {
        if (!ethers.utils.isAddress(address)) {
            throw new Error("invalid user address");
        }
        if (!Object.values(StorageSize).includes(storageCapacity)) {
            throw new Error("invalid storage capacity");
        }

        const start = DateTime.fromISO(startTime).toUTC();
        const end = DateTime.fromISO(endTime).toUTC();
        const startDate = start.set({ hour: 0, minute: 0, second: 0 });
        const endDate = end.set({ hour: 0, minute: 0, second: 0 });
        if (!startDate || !endDate || startDate < endDate) {
            throw new Error("invalid date range");
        }

        const startHour = start.set({ minute: 0, second: 0 });
        const endHour = end.get("hour") === 0 ? end.set({ hour: 23, minute: 59, second: 59 }) : end.set({ minute: 0, second: 0 });
        if (!startHour || !endHour || startHour === endHour) {
            throw new Error("invalid time range");
        }

        await this.providers.insertOne({
            address,
            startDate: startDate.toJSDate(),
            endDate: endDate.toJSDate(),
            startHour: startHour.toISOTime(),
            endHour: endHour.toISOTime(),
            storageCapacity,
            isAvailable: true,
            weightedRating: DEFAULT_RATING,
            storageDeals: [],
        });
    }

    async saveNewStorageDeal(deal: string, requester: string, startDate: string, endDate: string, sectorLinks: string[]): Promise<void> {
        if (!ethers.utils.isAddress(deal)) {
            throw new Error("invalid deal address");
        }
        if (!ethers.utils.isAddress(requester)) {
            throw new Error("invalid requester address");
        }
        const start = DateTime.fromISO(startDate);
        const end = DateTime.fromISO(endDate);
        if (end.diff(start).shiftTo("days").days == 0) {
            throw new Error("invalid date range");
        }

        await this.storageDeals.insertOne({
            address: deal,
            requester,
            startDate: start.toUTC().toISO(),
            endDate: end.toUTC().toISO(),
            sectorLinks: sectorLinks,
            state: "PENDING",
        });
    }

    async selectProvidersForDeal(startDate: string, endDate: string, sectors: number): Promise<string[][]> {
        const start = DateTime.fromISO(startDate).toUTC().set({ hour: 0, minute: 0, second: 0 });
        const end = DateTime.fromISO(endDate).toUTC().set({ hour: 0, minute: 0, second: 0 });
        if (!start || !end || start >= end) {
            throw new Error("invalid date range");
        }

        const assignments: string[][] = new Array(24).fill([]);
        for (let hour = 0; hour < assignments.length; hour++) {
            const curr = DateTime.fromObject({ hour }, { zone: "utc"});
            const cursor = this.providers.find({
                isAvailable: true,
                startDate: { $lte: start.toJSDate() },
                endDate: { $gte: end.toJSDate() },
                startHour: { $lte: curr.toISOTime() },
                endHour: { $gt: curr.toISOTime() },
            }).sort({
                weightedRating: "desc",
            });
    
            await cursor.forEach((provider) => {
                const { address, storageCapacity } = provider;
                const sectorCapacity = storageCapacity * 2;
                const size = Math.min(sectors - assignments[hour].length, sectorCapacity)
                const addresses = new Array(size).fill(address);
                assignments[hour] = [...assignments[hour], ...addresses];
    
                if (assignments[hour].length >= sectors) {
                    return;
                }
            });

            await cursor.close();
            if (assignments[hour].length < sectors) {
                throw new Error(`insufficient number of providers for time ${start.toISO()}`);
            }
        }
    
        return assignments;
    }
}

let dataManager: DataManager;
(async function() {
    // let temp = DateTime.fromObject({ year: 0, hour: 5 }, { zone: "utc"});
    // temp = temp.set({ hour: 0 });
    // console.log(temp.toISO(), temp.toJSDate());
    // temp = temp.set({ hour: 24 });
    // console.log(temp.toISO(), temp.toISOTime());
    dataManager = await DataManagerFactory.create();
    const schedule = await dataManager.selectProvidersForDeal("2023-01-02", "2023-05-02", 4);
    console.log(schedule);
}()) 

export {
    dataManager,
};