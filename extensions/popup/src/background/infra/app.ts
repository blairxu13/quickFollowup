import { sentApplication, getUnsentEmailsList } from "./helper";

export async function emailList (job: {}[], userId: string) {
    try {
        console.log("mother")
        await sentApplication (job, userId);
        const emailsRes = await getUnsentEmailsList(userId);
        console.log("son")
        return emailsRes;
      
    }catch (e) {
        console.log(e)
    }


}