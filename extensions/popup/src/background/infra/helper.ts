import { jsonPost, jsonGet, addUsers } from "./apiClient";

export async function sentApplication(job: any, userid: any) {
    console.log("job is", job)
    return jsonPost<null, typeof job>(`track_application?user_id=${userid}`, job);
}
export async function getUnsentEmailsList(userId: string) {
    return jsonGet<unknown[]>(`get_unsent_emails?user_id=${userId}`);
}
export async function logUsers(body: any) {
    return addUsers<unknown[]>(body, 'add_users');
}

//helper functions for a bunch of promises