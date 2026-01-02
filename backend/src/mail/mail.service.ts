import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  // 1. SEND INVITATION
  async sendInvite(email: string, name: string, token: string) {
    const inviteLink = `${process.env.FRONTEND_URL}/accept-invite?token=${token}`;

    try {
      await this.resend.emails.send({
        from: 'SFB Time Tracker <no-reply@sfbtimetracker.com>',
        to: email,
        subject: 'Welcome to SFB Team - Set your Password',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #2563eb;">Welcome, ${name}!</h2>
            <p>You have been invited to join the <strong>SF Business Solutions</strong> workspace.</p>
            <p>Please click the button below to activate your account and set your password:</p>
            <a href="${inviteLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Accept Invitation</a>
            <p style="font-size: 12px; color: #666;">Or copy this link: ${inviteLink}</p>
            <p>This link expires in 24 hours.</p>
          </div>
        `,
      });
      console.log(`✅ Invite email sent to ${email}`);
    } catch (error) {
      console.error('❌ Failed to send invite email:', error);
    }
  }

  // 2. SEND DAILY REPORT (Single Employee)
  async sendEmployeeReport(email: string, name: string, dayReport: string, weekReport: string) {
    try {
      await this.resend.emails.send({
        from: 'SFB Time Tracker <no-reply@sfbtimetracker.com>',
        to: email,
        subject: `Your Daily Activity Report - ${new Date().toLocaleDateString()}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2>Hi ${name},</h2>
            <p>Here is your activity summary.</p>
            
            <h3 style="border-bottom: 2px solid #ddd; padding-bottom: 5px;">Today's Activity</h3>
            ${dayReport}

            <br/>
            
            <h3 style="border-bottom: 2px solid #ddd; padding-bottom: 5px;">Last 7 Days Summary</h3>
            ${weekReport}
            
            <p style="margin-top: 30px; font-size: 12px; color: #888;">Generated automatically by SF Time Tracker.</p>
          </div>
        `,
      });
      console.log(`✅ Report sent to ${email}`);
    } catch (error) {
      console.error(`❌ Failed to send report to ${email}:`, error);
    }
  }

  // 3. SEND ADMIN REPORT (All Employees)
  async sendAdminReport(email: string, name: string, fullReportHtml: string) {
    try {
      await this.resend.emails.send({
        from: 'SFB Time Tracker <no-reply@sfbtimetracker.com>',
        to: email,
        subject: `Company Daily Report - ${new Date().toLocaleDateString()}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2>Hi ${name},</h2>
            <p>Here is the daily summary for all employees.</p>
            
            ${fullReportHtml}
            
            <p style="margin-top: 30px; font-size: 12px; color: #888;">Confidential - Admin Eyes Only.</p>
          </div>
        `,
      });
      console.log(`✅ Admin Report sent to ${email}`);
    } catch (error) {
      console.error(`❌ Failed to send admin report to ${email}:`, error);
    }
  }
}