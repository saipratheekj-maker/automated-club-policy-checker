-- ============================================
-- UniClub MySQL Database Schema
-- ============================================

CREATE DATABASE IF NOT EXISTS uniclub;
USE uniclub;

-- Admin table (single university admin)
CREATE TABLE admin (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rules table
CREATE TABLE rules (
  id VARCHAR(10) PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  condition_text VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  english_sentence TEXT,
  is_custom TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Applications table
CREATE TABLE applications (
  id VARCHAR(30) PRIMARY KEY,
  contact_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  club_name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  members INT DEFAULT 0,
  majors INT DEFAULT 0,
  female_pct FLOAT DEFAULT 0,
  pres_year VARCHAR(20),
  treasurer VARCHAR(5),
  advisor VARCHAR(100),
  advisor_email VARCHAR(150),
  constitution VARCHAR(5),
  meetings_per_month INT DEFAULT 0,
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  assigned_user VARCHAR(50),
  assigned_pass VARCHAR(100),
  submitted_date DATE NOT NULL,
  decided_at TIMESTAMP NULL
);

-- Clubs table
CREATE TABLE clubs (
  id VARCHAR(30) PRIMARY KEY,
  app_id VARCHAR(30) NOT NULL,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  status ENUM('active','inactive') DEFAULT 'active',
  head_user VARCHAR(50) NOT NULL,
  creds_changed TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (app_id) REFERENCES applications(id)
);

-- Users table (club heads)
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  club_id VARCHAR(30) NOT NULL,
  creds_changed TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (club_id) REFERENCES clubs(id)
);

-- Members table
CREATE TABLE members (
  id INT PRIMARY KEY AUTO_INCREMENT,
  club_id VARCHAR(30) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(100),
  is_head TINYINT(1) DEFAULT 0,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (club_id) REFERENCES clubs(id)
);

-- Events table
CREATE TABLE events (
  id INT PRIMARY KEY AUTO_INCREMENT,
  club_id VARCHAR(30) NOT NULL,
  name VARCHAR(150) NOT NULL,
  event_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (club_id) REFERENCES clubs(id)
);

-- ============================================
-- Default seed data
-- ============================================
INSERT INTO admin (username, password_hash) VALUES ('admin', '$2b$10$examplehashedpassword');

INSERT INTO rules (id, category, name, condition_text, message, is_custom) VALUES
('R01','Membership','Minimum active members','members < 10','Needs at least 10 active members.',0),
('R02','Membership','Maximum members limit','members > 200','Cannot exceed 200 members.',0),
('R03','Leadership','President eligibility','presYear NOT IN (Junior,Senior)','President must be Junior or Senior.',0),
('R04','Diversity','Multi-major requirement','majors < 2','Must include members from at least 2 majors.',0),
('R05','Diversity','Gender diversity >= 20%','female_pct < 20','Female percentage must be at least 20%.',0),
('R06','Advising','Faculty advisor required','advisor IS NULL','A faculty advisor must be assigned.',0),
('R07','Advising','Advisor university email','advisor_email NOT LIKE @university.edu','Advisor email must end in @university.edu.',0),
('R08','Governance','Written constitution required','constitution != yes','Club must have a written constitution.',0),
('R09','Governance','Treasurer required','treasurer != yes','A treasurer must be appointed.',0),
('R10','Governance','Min meetings per month','meetings < 2','Must hold at least 2 meetings per month.',0),
('R11','Activity','Description length','description < 20 chars','Description must be at least 20 characters.',0),
('R12','Sports','Sports: min 15 members','category=Sports AND members < 15','Sports clubs need at least 15 members.',0),
('R13','Sports','Sports: min 4 meetings/month','category=Sports AND meetings < 4','Sports clubs need at least 4 meetings/month.',0),
('R14','Academic','Academic: faculty required','category=Academic AND advisor IS NULL','Academic clubs require a faculty advisor.',0),
('R15','Cultural','Cultural: multi-major','category=Cultural AND majors < 3','Cultural clubs need members from at least 3 majors.',0),
('R17','Membership','Members >= majors claimed','members < majors','Member count must be >= number of majors claimed.',0),
('R18','Finance','Treasurer for >20 members','members > 20 AND treasurer != yes','Clubs with more than 20 members must have a treasurer.',0),
('R19','Religious','Religious: >=30% female','category=Religious AND female_pct < 30','Religious clubs need at least 30% female membership.',0),
('R20','Environmental','Environmental: min 3 meetings','category=Environmental AND meetings < 3','Environmental clubs need at least 3 meetings/month.',0);
