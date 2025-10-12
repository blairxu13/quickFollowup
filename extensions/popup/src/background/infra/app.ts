import { sentApplication, getUnsentEmailsList } from "./helper";

export async function emailList (job: {}[], userId: string) {
    try {
        await sentApplication ({ ...job, user_id: userId});
        const emailsRes = await getUnsentEmailsList(userId);
        return emailsRes;
      
    }catch (e) {
        console.log(e)
    }


}