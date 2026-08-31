#!/usr/bin/env bash

# Terminal Colors
R='\033[1;31m'; G='\033[1;32m'; Y='\033[1;33m'; C='\033[1;36m'; NC='\033[0m'

echo -e "${G}[*] Step 1: Installing Git...${NC}"
pkg update -y && pkg install -y git

# Ensure we are in the correct directory
DIR="$HOME/WebsiteNgIniwan"
cd "$DIR" || { echo -e "${R}Directory not found! Please make sure your project exists first.${NC}"; exit 1; }

echo -e "${G}[*] Step 2: Initializing local Git repository...${NC}"
git init

# Configure local git identity if not already set globally
git config user.name "KIM_MJ123"
git config user.email "kyleivanmendejacss9@gmail.com"

echo -e "${G}[*] Step 3: Staging and committing files...${NC}"
git add .
git commit -m "Initial commit for AURORA hub with TikTok sound fix"

echo -e "\n${C}==================================================${NC}"
echo -e "${Y}                 IMPORTANT SETUP                  ${NC}"
echo -e "${C}==================================================${NC}"
echo -e "Before proceeding, make sure you have created an empty repository"
echo -e "on GitHub (e.g., named 'WebsiteNgIniwan')."
echo -e "Enter your full GitHub repository URL below:"
echo -e "https://github.com/UraniumSecretWebsite/WebsiteNgIniwan.git"
read -rp "GitHub Repo URL: " REPO_URL

if [ -z "$REPO_URL" ]; then
    echo -e "${R}[!] No URL provided. Skipping remote link. You can add it later using 'git remote add origin <url>'.${NC}"
else
    echo -e "${G}[*] Step 4: Linking to GitHub and pushing code...${NC}"
    git remote add origin "$REPO_URL"
    git branch -M main
    git push -u origin main
    echo -e "\n${G}[+] Success! Your project is now backed up and connected to GitHub.${NC}"
fi