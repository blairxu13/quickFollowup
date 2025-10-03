import { sentApplication, getUnsentEmailsList } from "./helper";

export async function emailList (job: {}[], userId: string) {
    try {
        const trackRes = await sentApplication ({ ...job, user_id: userId});
        const emailsRes = await getUnsentEmailsList(userId);
      
    }catch (e) {
        console.log(e)
    }


}