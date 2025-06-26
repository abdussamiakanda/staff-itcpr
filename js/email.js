export async function sendEmail(email, subject, message) {
    console.log('Sending email to:', email);
    try {
        const response = await fetch('https://api.itcpr.org/email/itcpr', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            mode: 'cors',
            credentials: 'omit',
            body: JSON.stringify({
                to: email,
                subject: subject,
                message: message
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.status === 'success') {
            console.log('Email sent successfully:', data.message);
            return true;
        } else {
            throw new Error(data.message || 'Failed to send email');
        }

    } catch (error) {
        console.error('Email error:', error.message);
        return false;
    }
}

export function getEmailTemplate(name, message) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body>
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="border-bottom: 1px solid rgb(157, 157, 189); text-align: center; width: 100%;">
                    <span style="font-size: 35px; font-weight: bold; color: rgb(157, 157, 189);">ITCPR</span>
                </div>
                
                <div style="padding: 10px; background-color: #ffffff;">
                    <p>Dear ${name},</p>
                    ${message}
                    <p>Best regards,<br>The ITCPR Team</p>
                </div>

                <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #666;">
                    <p>© ${new Date().getFullYear()} ITCPR. All rights reserved.</p>
                    <p>This is an automated message, please do not reply.</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

export async function sendAcceptApplicationEmail(applicationData, group) {
    const { name, email } = applicationData;

    const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

    const message = `
        <p>We are pleased to offer you an internship position in our ${capitalize(group)} Group
        at the Institution for Theoretical & Computational Physics Research.
        Your skills and background make you an ideal fit for our team, and we are excited
        about the potential contributions you will bring.</p>

        <p>Position Details:</p>
        <ul>
            <li>Title: Intern</li>
            <li>Research Group: ${capitalize(group)} Group</li>
            <li>Expected Hours: 10 hours per week</li>
            <li>Duration: 1 year (Conditional on performance)</li>
        </ul>

        <p>Responsibilities:</p>
        <ul>
            <li>Participating in specialized training sessions to enhance your skills.</li>
            <li>Contributing to team meetings with insights and ideas.</li>
            <li>Assisting in data analysis and research documentation.</li>
            <li>Collaborating on theoretical and computational physics projects.</li>
            <li>Complying with institutional policies and ethical standards.</li>
        </ul>

        <p>Terms of Internship:</p>
        <ul>
            <li>The internship concludes in June/December, depending on your recruitment cycle, with the option to re-apply for continuation into the next year.</li>
            <li>This is a self-funded institution; therefore, the internship position is unpaid.</li>
            <li>Interns will receive comprehensive training in various software and research methodologies crucial for their role.</li>
            <li>Each intern will be under the supervision of the lead of their assigned research group.</li>
            <li>Interns will be evaluated each month based on their performance and contributions to the team.</li>
            <li>Adherence to confidentiality and data protection standards is mandatory, particularly regarding sensitive research information.</li>
            <li>Completion of the internship does not guarantee subsequent membership with ITCPR.</li>
        </ul>
        <p>
            ITCPR internship handbook is a comprehensive guide detailing the structure, expectations, and responsibilities of interns at 
            ITCPR. It includes information about mentorship, weekly meetings, and evaluation criteria. <br><br>
            Download the handbook: <a href="https://itcpr.org/files/data/internship_handbook.pdf">ITCPR Internship Handbook (PDF)</a>
            <br>
            Please review the handbook thoroughly before starting your internship to ensure you understand the expectations and guidelines.
        </p>
        <p>We hope you will find your experience with us, rewarding and insightful.</p>
    `;

    const subject = `Your Application to Join ITCPR is Approved`;

    return sendEmail(email, subject, getEmailTemplate(name, message));
}

export async function sendRejectApplicationEmail(applicationData, rejectReason) {
    const { name, email } = applicationData;

    const subject = `Your Application to Join ITCPR is Rejected`;

    const message = `
        <p>
            We appreciate the time and effort you dedicated to your application and for
            your interest in joining our team.
        </p>
        <p>
            After careful consideration, I regret to inform you that we will not be moving
            forward with your application for this position. Please understand that this
            decision does not diminish the value of your skills and accomplishments. We
            encourage you to apply for future opportunities at ITCPR that align with your
            qualifications and interests.
        </p>
        <b>Reason for rejection:</b>
        ${markdownToHtml(rejectReason)}
        <p>
            We appreciate your interest in ITCPR and wish you all the best in your future
            endeavors.
        </p>
    `;

    return sendEmail(email, subject, getEmailTemplate(name, message));
}

function markdownToHtml(markdownText) {
    // Make sure 'marked' is available
    if (typeof marked === 'undefined') {
      throw new Error("The 'marked' library is required. Include it via CDN or install it.");
    }
  
    return marked.parse(markdownText);
}