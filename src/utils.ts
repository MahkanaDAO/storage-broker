import { DateTime, DurationLikeObject, Interval } from "luxon";

function getDuration(start: string, end: string, unit: keyof DurationLikeObject = "days"): number {
    const interval = Interval.fromDateTimes(
        DateTime.fromISO(start), 
        DateTime.fromISO(end),
    );
    if (!interval.isValid) {
        throw new Error("invalid date range");
    }

    return interval.toDuration().get(unit);
}

function getStorageDeals() {

}

async function splitFile(file: Express.Multer.File): Promise<string[]> {
    const requests = [];

    // const sectorSize = 512;
    // for (let i = 0; i < file.size; i += sectorSize) {
    //     const size = Math.min(file.size, i + sectorSize);
    //     filereader.read(i, size);
    //     requests.append(google.post());
    // }

    const sectorLinks = await Promise.all(requests);
    return sectorLinks;
}

export {
    getDuration,
    splitFile,
};