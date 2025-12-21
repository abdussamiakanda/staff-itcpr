/**
 * Send a message to a Discord channel
 * @param {string} groupId - Group ID (not used in current implementation)
 * @param {string} message - Message to send
 */
export async function sendMessageToChannel(groupId, message) {
  const apiUrl = import.meta.env.VITE_API_DISCORD_MESSAGE_URL;
  const channelId = import.meta.env.VITE_DISCORD_CHANNEL_ID;

  if (!apiUrl) {
    console.warn('VITE_API_DISCORD_MESSAGE_URL is not defined, skipping Discord message');
    return;
  }

  if (!channelId) {
    console.warn('VITE_DISCORD_CHANNEL_ID is not defined, skipping Discord message');
    return;
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ channelId, message })
    });

    const data = await response.json();
    console.log("Message response:", data);
    return data;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
}

