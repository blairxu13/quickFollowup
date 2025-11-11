import { sentApplication, getUnsentEmailsList } from "./helper";

export async function emailList (job: {}[], userId: string) {
    try {
        console.log("[emailList] sending job", job, "for user", userId);
        const trackRes = await sentApplication (job, userId);
        console.log("[emailList] track_application response", trackRes);
        const emailsRes = await getUnsentEmailsList(userId);
        console.log("[emailList] get_unsent_emails response", emailsRes);
        return emailsRes;
    }catch (e) {
        console.error("[emailList] caught error", e);
        return { ok: false, error: { message: String(e) } };
    }
}