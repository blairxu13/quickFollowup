import { sentApplication, getUnsentEmailsList } from "./helper";

export async function emailList (job: {}[], userId: string) {
    try {
        await sentApplication (job, userId);
        const emailsRes = await getUnsentEmailsList(userId);
        return emailsRes;
    }catch (e) {
        return { ok: false, error: { message: String(e) } };
    }
}