# UniClub — Automated Policy Checker for University Clubs

A full-stack web application that automates the process of evaluating, approving, and managing university club registrations using a Rule-Based Expert System and Formal Logic inference engine.

---

## Project Overview

UniClub replaces manual administrator review with an automated policy engine that evaluates club applications against a set of formal production rules (IF-THEN logic). The system supports three workflows — club application submission, administrator review and approval, and club management — all within a clean, role-based web interface.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js, Express.js |
| Database | MySQL |
| Auth | JWT (JSON Web Tokens) |
| Password Security | bcrypt hashing |
| API Style | RESTful |

---

## Features

### Landing Page
- Clean entry point with Sign In and Create Club Account options
- Separate administrator login link

### Club Application (Public)
- Multi-section application form with live policy rule hints at every section
- Hints update in real time whenever the admin adds or removes a rule
- Built-in Check Policy button runs the inference engine before submission
- Displays a full violation trace so applicants know exactly what to fix

### Administrator Portal
- Secure login with JWT authentication
- Dashboard with live statistics — total applications, pending, approved, rejected, active clubs, rule count
- Full application review with policy violation trace
- Manual credential assignment — admin types the username and password for each approved club
- Send Mail button dispatches a simulated approval email with credentials to the club owner
- Rejection sends an automatic notification email to the applicant
- Clubs database showing all approved clubs, their credentials, and whether credentials have been changed
- Rule Base management — view, add, and remove policy rules

### Rule Management (Admin)
- Admin types a rule in plain English (e.g. "A club must have at least 15 members")
- Built-in NLP keyword parser converts the sentence into a formal IF-THEN production rule
- Parsed rule is shown to the admin for confirmation before saving
- If the sentence cannot be interpreted, the system prompts the admin to rephrase
- Note and examples are shown to guide the admin on how to write valid sentences
- Adding or removing any rule instantly updates the hints on the application form
- Rules take effect immediately on all future policy checks

### Club Owner Portal
- Login with admin-assigned credentials
- One-time credential change for security (enforced at the database level)
- Club overview with live policy compliance status
- Member management — add and remove members with name and role
- Events and announcements — add and remove upcoming events with dates
- Settings panel for credential update

### Policy Engine (Inference Engine)
- 19 default production rules across 7 categories
- Categories: Membership, Leadership, Diversity, Advising, Governance, Finance, Activity
- Category-specific rules for Sports, Cultural, Academic, Religious, and Environmental clubs
- Every application is evaluated against all active rules on every check
- Full violation trace generated with rule ID, rule name, and reason message

---

## Database Schema

```sql
admin          -- Single university administrator account
applications   -- All club applications with status and assigned credentials
clubs          -- Approved and active clubs linked to their application
users          -- Club head accounts with hashed passwords and credentials-changed flag
members        -- Club members with name, role, and club reference
events         -- Club events and announcements with date
rules          -- All policy rules including custom rules added by admin
```

---

## Setup Instructions

### Prerequisites
- Node.js v18 or higher
- MySQL 8.0 or higher

### 1. Set up the database
```bash
mysql -u root -p < database/uniclub_schema.sql
```
Or open `uniclub_schema.sql` in MySQL Workbench and run it.

### 2. Install backend dependencies
```bash
cd backend
npm install
```

### 3. Configure environment variables
```bash
cp .env.example .env
```
Edit `.env` and fill in your MySQL credentials:
```
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASS=your_mysql_password
DB_NAME=uniclub
JWT_SECRET=your_secret_key_here
```

### 4. Start the server
```bash
node server.js
```
Server runs at `http://localhost:3000`

### 5. Open the frontend
Open `frontend/uniclub.html` in your browser.

---

## Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Administrator | admin | admin123 |
| Club Head (Marathon Club) | marathon01 | Mrt$8291 |

---

## Default Policy Rules

| ID | Category | Rule |
|----|----------|------|
| R01 | Membership | Minimum 10 active members |
| R02 | Membership | Maximum 200 members |
| R03 | Leadership | President must be Junior or Senior |
| R04 | Diversity | Members from at least 2 majors |
| R05 | Diversity | Female membership at least 20% |
| R06 | Advising | Faculty advisor required |
| R07 | Advising | Advisor must have university email |
| R08 | Governance | Written constitution required |
| R09 | Governance | Treasurer must be appointed |
| R10 | Governance | Minimum 2 meetings per month |
| R11 | Activity | Club description minimum 20 characters |
| R12 | Sports | Sports clubs need at least 15 members |
| R13 | Sports | Sports clubs need at least 4 meetings/month |
| R14 | Academic | Academic clubs require a faculty advisor |
| R15 | Cultural | Cultural clubs need members from 3+ majors |
| R17 | Membership | Member count must be >= majors claimed |
| R18 | Finance | Clubs with >20 members must have treasurer |
| R19 | Religious | Religious clubs need at least 30% female |
| R20 | Environmental | Environmental clubs need 3+ meetings/month |

---

## Author

Built as an academic project demonstrating Rule-Based Systems, Formal Logic, and Knowledge Representation in Artificial Intelligence.
