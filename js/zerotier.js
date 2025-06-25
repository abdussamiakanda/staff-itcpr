const API_BASE_URL = 'https://api.itcpr.org/zerotier';

export async function deauthenticateZeroTierMember(memberId) {
    try {
        const response = await fetch(`${API_BASE_URL}/deauthenticate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ member_id: memberId }) // Send the member ID
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Error de-authenticating member: ${errorData.error || response.statusText}`);
        }

        const data = await response.json();
        console.log(`Member ${memberId} de-authenticated successfully:`, data);
    } catch (error) {
        console.error('De-authentication failed:', error);
    }
}