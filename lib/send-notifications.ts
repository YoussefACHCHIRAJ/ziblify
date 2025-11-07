import axios from "axios";

export interface ISendNotificationPayload {
  action: "done" | "missed" | "custom";
  person: string;
  excludeToken: string;
  timestamp: string;
  notification?: {
    title: string,
    body: string,
  }
}
export const sendNotification = async (payload: ISendNotificationPayload) => {
  try {
    const { data } = await axios.post(
      `https://ziblify-server.netlify.app/.netlify/functions/send-notification`,
      payload
    );

    return data;
  } catch (error) {
    console.log("Failed to send the notification.");
    console.error(error);
  }
};

