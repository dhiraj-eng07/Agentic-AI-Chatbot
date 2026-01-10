const nodemailer = require('nodemailer');
const { AppError } = require('../middleware/errorHandler');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_PORT == 465,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    async sendMeetingInvitation({ to, meeting, organizer }) {
        try {
            const meetingLink = `${process.env.CLIENT_URL}/meetings/${meeting._id}`;
            const icalEvent = this.generateICalEvent(meeting, organizer);

            const mailOptions = {
                from: `"AI Productivity Assistant" <${process.env.EMAIL_FROM}>`,
                to,
                subject: `Meeting Invitation: ${meeting.title}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">Meeting Invitation</h2>
                        
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0;">${meeting.title}</h3>
                            
                            <p><strong>Organizer:</strong> ${organizer.name} (${organizer.email})</p>
                            
                            <p><strong>Date & Time:</strong> ${new Date(meeting.startTime).toLocaleString()} - 
                            ${new Date(meeting.endTime).toLocaleTimeString()}</p>
                            
                            ${meeting.description ? `<p><strong>Description:</strong> ${meeting.description}</p>` : ''}
                            
                            ${meeting.agenda && meeting.agenda.length > 0 ? `
                                <p><strong>Agenda:</strong></p>
                                <ul>
                                    ${meeting.agenda.map(item => `<li>${item}</li>`).join('')}
                                </ul>
                            ` : ''}
                            
                            ${meeting.location ? `<p><strong>Location:</strong> ${meeting.location}</p>` : 
                            '<p><strong>Location:</strong> Virtual Meeting</p>'}
                        </div>
                        
                        <div style="margin: 20px 0;">
                            <a href="${meetingLink}" 
                               style="background: #667eea; color: white; padding: 12px 24px; 
                                      text-decoration: none; border-radius: 6px; display: inline-block;">
                                View Meeting Details
                            </a>
                        </div>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; 
                                    font-size: 12px; color: #6b7280;">
                            <p>This meeting was scheduled via AI Productivity Assistant.</p>
                            <p>You can accept or decline this invitation by visiting the meeting page.</p>
                        </div>
                    </div>
                `,
                text: `
                    Meeting Invitation: ${meeting.title}
                    
                    Organizer: ${organizer.name} (${organizer.email})
                    Date & Time: ${new Date(meeting.startTime).toLocaleString()} - ${new Date(meeting.endTime).toLocaleTimeString()}
                    ${meeting.description ? `Description: ${meeting.description}` : ''}
                    ${meeting.agenda ? `Agenda: ${meeting.agenda.join(', ')}` : ''}
                    Location: ${meeting.location || 'Virtual Meeting'}
                    
                    View meeting details: ${meetingLink}
                    
                    This meeting was scheduled via AI Productivity Assistant.
                `,
                icalEvent: {
                    filename: 'meeting.ics',
                    content: icalEvent
                }
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`Meeting invitation sent to ${to}`);
        } catch (error) {
            console.error('Error sending meeting invitation:', error);
            throw new AppError('Failed to send meeting invitation', 500, 'EMAIL_SEND_FAILED');
        }
    }

    async sendTaskAssignment({ to, task, assigner }) {
        try {
            const taskLink = `${process.env.CLIENT_URL}/tasks/${task._id}`;

            const mailOptions = {
                from: `"AI Productivity Assistant" <${process.env.EMAIL_FROM}>`,
                to,
                subject: `New Task Assigned: ${task.title}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">New Task Assignment</h2>
                        
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0;">${task.title}</h3>
                            
                            <p><strong>Assigned by:</strong> ${assigner.name} (${assigner.email})</p>
                            
                            ${task.description ? `<p><strong>Description:</strong> ${task.description}</p>` : ''}
                            
                            ${task.dueDate ? `
                                <p><strong>Due Date:</strong> ${new Date(task.dueDate).toLocaleDateString()}</p>
                            ` : ''}
                            
                            <p><strong>Priority:</strong> 
                                <span style="color: ${this.getPriorityColor(task.priority)}; font-weight: bold;">
                                    ${task.priority.toUpperCase()}
                                </span>
                            </p>
                            
                            ${task.tags && task.tags.length > 0 ? `
                                <p><strong>Tags:</strong> 
                                    ${task.tags.map(tag => `<span style="background: #e5e7eb; padding: 4px 8px; 
                                                           border-radius: 4px; margin-right: 4px;">${tag}</span>`).join('')}
                                </p>
                            ` : ''}
                        </div>
                        
                        <div style="margin: 20px 0;">
                            <a href="${taskLink}" 
                               style="background: #10b981; color: white; padding: 12px 24px; 
                                      text-decoration: none; border-radius: 6px; display: inline-block;">
                                View Task Details
                            </a>
                        </div>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; 
                                    font-size: 12px; color: #6b7280;">
                            <p>This task was assigned via AI Productivity Assistant.</p>
                            <p>You can update the status, add notes, or request clarification from the task page.</p>
                        </div>
                    </div>
                `,
                text: `
                    New Task Assignment: ${task.title}
                    
                    Assigned by: ${assigner.name} (${assigner.email})
                    ${task.description ? `Description: ${task.description}` : ''}
                    ${task.dueDate ? `Due Date: ${new Date(task.dueDate).toLocaleDateString()}` : ''}
                    Priority: ${task.priority.toUpperCase()}
                    ${task.tags ? `Tags: ${task.tags.join(', ')}` : ''}
                    
                    View task details: ${taskLink}
                    
                    This task was assigned via AI Productivity Assistant.
                `
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`Task assignment sent to ${to}`);
        } catch (error) {
            console.error('Error sending task assignment:', error);
            throw new AppError('Failed to send task assignment', 500, 'EMAIL_SEND_FAILED');
        }
    }

    async sendReminder({ to, reminder, user }) {
        try {
            const mailOptions = {
                from: `"AI Productivity Assistant" <${process.env.EMAIL_FROM}>`,
                to,
                subject: `Reminder: ${reminder.title}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">⏰ Reminder</h2>
                        
                        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0;">${reminder.title}</h3>
                            
                            ${reminder.description ? `<p>${reminder.description}</p>` : ''}
                            
                            <p><strong>Time:</strong> ${new Date(reminder.dueDate).toLocaleString()}</p>
                            
                            <p style="color: #d97706; font-weight: bold;">
                                ⚠️ This is a reminder set via AI Assistant
                            </p>
                        </div>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; 
                                    font-size: 12px; color: #6b7280;">
                            <p>To manage your reminders, visit your AI Assistant dashboard.</p>
                        </div>
                    </div>
                `,
                text: `
                    REMINDER: ${reminder.title}
                    
                    ${reminder.description || ''}
                    
                    Time: ${new Date(reminder.dueDate).toLocaleString()}
                    
                    This is a reminder set via AI Assistant.
                    
                    To manage your reminders, visit your AI Assistant dashboard.
                `
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`Reminder sent to ${to}`);
        } catch (error) {
            console.error('Error sending reminder:', error);
            throw new AppError('Failed to send reminder', 500, 'EMAIL_SEND_FAILED');
        }
    }

    async sendMeetingUpdate({ to, meeting, organizer }) {
        try {
            const meetingLink = `${process.env.CLIENT_URL}/meetings/${meeting._id}`;

            const mailOptions = {
                from: `"AI Productivity Assistant" <${process.env.EMAIL_FROM}>`,
                to,
                subject: `Meeting Updated: ${meeting.title}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">Meeting Updated</h2>
                        
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0;">${meeting.title}</h3>
                            <p><em>This meeting has been updated by the organizer.</em></p>
                            
                            <p><strong>Organizer:</strong> ${organizer.name} (${organizer.email})</p>
                            
                            <p><strong>New Date & Time:</strong> ${new Date(meeting.startTime).toLocaleString()} - 
                            ${new Date(meeting.endTime).toLocaleTimeString()}</p>
                            
                            ${meeting.location ? `<p><strong>Location:</strong> ${meeting.location}</p>` : ''}
                        </div>
                        
                        <div style="margin: 20px 0;">
                            <a href="${meetingLink}" 
                               style="background: #3b82f6; color: white; padding: 12px 24px; 
                                      text-decoration: none; border-radius: 6px; display: inline-block;">
                                View Updated Meeting
                            </a>
                        </div>
                    </div>
                `,
                text: `
                    Meeting Updated: ${meeting.title}
                    
                    This meeting has been updated by the organizer.
                    
                    Organizer: ${organizer.name} (${organizer.email})
                    New Date & Time: ${new Date(meeting.startTime).toLocaleString()} - ${new Date(meeting.endTime).toLocaleTimeString()}
                    ${meeting.location ? `Location: ${meeting.location}` : ''}
                    
                    View updated meeting: ${meetingLink}
                `
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`Meeting update sent to ${to}`);
        } catch (error) {
            console.error('Error sending meeting update:', error);
            // Don't throw - meeting update email is less critical
        }
    }

    async sendMeetingCancellation({ to, meeting, organizer }) {
        try {
            const mailOptions = {
                from: `"AI Productivity Assistant" <${process.env.EMAIL_FROM}>`,
                to,
                subject: `Meeting Cancelled: ${meeting.title}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #dc2626;">❌ Meeting Cancelled</h2>
                        
                        <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #dc2626;">${meeting.title}</h3>
                            <p><strong>Cancelled by:</strong> ${organizer.name} (${organizer.email})</p>
                            
                            <p><strong>Original Date & Time:</strong> ${new Date(meeting.startTime).toLocaleString()}</p>
                            
                            ${meeting.description ? `<p><strong>Description:</strong> ${meeting.description}</p>` : ''}
                        </div>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; 
                                    font-size: 12px; color: #6b7280;">
                            <p>This meeting was cancelled via AI Productivity Assistant.</p>
                            <p>Contact the organizer if you have any questions.</p>
                        </div>
                    </div>
                `,
                text: `
                    Meeting Cancelled: ${meeting.title}
                    
                    Cancelled by: ${organizer.name} (${organizer.email})
                    Original Date & Time: ${new Date(meeting.startTime).toLocaleString()}
                    ${meeting.description ? `Description: ${meeting.description}` : ''}
                    
                    This meeting was cancelled via AI Productivity Assistant.
                    Contact the organizer if you have any questions.
                `
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`Meeting cancellation sent to ${to}`);
        } catch (error) {
            console.error('Error sending meeting cancellation:', error);
            // Don't throw - cancellation email is less critical
        }
    }

    async sendTaskStatusUpdate({ to, task, oldStatus, newStatus, updatedBy }) {
        try {
            const taskLink = `${process.env.CLIENT_URL}/tasks/${task._id}`;

            const mailOptions = {
                from: `"AI Productivity Assistant" <${process.env.EMAIL_FROM}>`,
                to,
                subject: `Task Status Updated: ${task.title}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">Task Status Updated</h2>
                        
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0;">${task.title}</h3>
                            
                            <p><strong>Updated by:</strong> ${updatedBy.name} (${updatedBy.email})</p>
                            
                            <p>
                                <strong>Status changed:</strong> 
                                <span style="color: #6b7280; text-decoration: line-through;">${oldStatus}</span> 
                                → 
                                <span style="color: #10b981; font-weight: bold;">${newStatus}</span>
                            </p>
                            
                            ${task.dueDate ? `
                                <p><strong>Due Date:</strong> ${new Date(task.dueDate).toLocaleDateString()}</p>
                            ` : ''}
                        </div>
                        
                        <div style="margin: 20px 0;">
                            <a href="${taskLink}" 
                               style="background: #3b82f6; color: white; padding: 12px 24px; 
                                      text-decoration: none; border-radius: 6px; display: inline-block;">
                                View Task
                            </a>
                        </div>
                    </div>
                `,
                text: `
                    Task Status Updated: ${task.title}
                    
                    Updated by: ${updatedBy.name} (${updatedBy.email})
                    Status changed: ${oldStatus} → ${newStatus}
                    ${task.dueDate ? `Due Date: ${new Date(task.dueDate).toLocaleDateString()}` : ''}
                    
                    View task: ${taskLink}
                `
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`Task status update sent to ${to}`);
        } catch (error) {
            console.error('Error sending task status update:', error);
            // Don't throw - status update email is less critical
        }
    }

    generateICalEvent(meeting, organizer) {
        const formatDate = (date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        
        return `
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AI Productivity Assistant//EN
BEGIN:VEVENT
UID:${meeting._id}@${process.env.EMAIL_DOMAIN || 'productivity.ai'}
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(meeting.startTime)}
DTEND:${formatDate(meeting.endTime)}
SUMMARY:${meeting.title}
DESCRIPTION:${meeting.description || ''}
LOCATION:${meeting.location || 'Virtual Meeting'}
ORGANIZER;CN="${organizer.name}":mailto:${organizer.email}
${meeting.participants.map(p => `ATTENDEE;CN="${p.email}";RSVP=TRUE:mailto:${p.email}`).join('\n')}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR
        `.trim();
    }

    getPriorityColor(priority) {
        const colors = {
            high: '#dc2626',
            medium: '#d97706',
            low: '#059669'
        };
        return colors[priority] || '#6b7280';
    }
}
// Update the import
const AIService = require('../services/ai/AIService');

// In processMessage method, replace:
// const aiResponse = await OpenAIService.generateResponse(message, user, conversationContext);

// With:
const aiResponse = await AIService.generateResponse(message, user, conversationContext);
module.exports = new EmailService();
