import { jsonPost, jsonGet } from "./apiClient";

export async function sentApplication (job: any) {
    return jsonPost<null, typeof job> ("/track_application", job);
}
export async function getUnsentEmailsList (userId: string) {
    return jsonGet<unknown[]>('./get_unsent_emails?user_id=${userId}');
}
//helper functions for a bunch of promises