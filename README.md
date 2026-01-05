# 🇳🇵 Nepali Salary Calculator

[![Deploy to GitHub Pages](https://github.com/scuba3198/salary-calculator/actions/workflows/deploy.yml/badge.svg)](https://github.com/scuba3198/salary-calculator/actions/workflows/deploy.yml)
[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen)](https://scuba3198.github.io/salary-calculator)

A premium, modern, and responsive React application designed for the Nepali workforce. Track workdays, calculate monthly earnings, and manage multiple workspaces with ease using the Nepali (Bikram Sambat) calendar system.

---

## 🔗 [Visit Live Application](https://scuba3198.github.io/salary-calculator)

---

## ✨ Key Features

### 🛡️ Smart Authentication & Guest Mode
*   **Transient Guest Mode**: Jump right in! Use the "Draft Workspace" without an account. Your data is stored ephemerally so you can test calculations instantly.
*   **Seamless Merge-on-Login**: Start as a guest, then sign up later. All your guest data—including marked workdays and organization settings—automatically merges into your new account upon your first login.
*   **Secure Supabase Auth**: Industrial-grade security for your data once you're ready to commit.

### 🏢 Multi-Workspace Management
*   **Independent Settings**: Create multiple organizations or project workspaces.
*   **Custom Rates**: Set unique hourly rates, daily working hours, and TDS (Tax Deducted at Source) percentages for each organization.
*   **Workspace Switching**: Toggle between different jobs or freelance projects in one click.

### 📅 Nepali Calendar System
*   **Native Date Handling**: Built specifically for the Nepali context using the `nepali-date-converter`.
*   **Interactive Interface**: Simply tap or click dates to mark attendance.
*   **Visual Indicators**: Clear distinctions between regular days, weekends, and holidays.

### 📊 Real-time Statistics
*   **Instant Calculation**: Watch your gross and net salary update live as you mark days.
*   **Tax Breakdown**: Automatic TDS calculation based on your workspace settings.
*   **Monthly Overview**: Track total days worked and total hours for any given month.

---

## 🎨 Design Philosophy
*   **Glassmorphism & Vibrancy**: A sleek UI with glass-like surfaces and vibrant accents.
*   **Dark Mode Native**: A premium dark theme enabled by default, with an elegant light mode alternative.
*   **Micro-animations**: Subtle transitions and hover effects using Vanilla CSS for a lightweight, "alive" feel.
*   **Responsive First**: Perfectly optimized for everything from ultra-wide monitors to mobile screens.

---

## 🛠️ Tech Stack

*   **Frontend**: [React 19](https://react.dev/)
*   **Build Tool**: [Vite 7](https://vite.dev/)
*   **Database & Auth**: [Supabase](https://supabase.com/)
*   **Styling**: Vanilla CSS (Modern CSS Variables & Flex/Grid)
*   **Icons**: [Lucide React](https://lucide.dev/)
*   **Date Logic**: `nepali-date-converter`

---

## 🚀 Getting Started

### Prerequisites
*   [Node.js](https://nodejs.org/) (v20+ recommended)
*   [npm](https://www.npmjs.com/)

### Installation

1.  **Clone & Enter**
    ```bash
    git clone https://github.com/scuba3198/salary-calculator.git
    cd salary-calculator
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file in the root:
    ```env
    VITE_SUPABASE_URL=your_project_url
    VITE_SUPABASE_ANON_KEY=your_anon_key
    ```
    *(See `.env.example` for reference)*

4.  **Launch Development Server**
    ```bash
    npm run dev
    ```

---

## 📜 Scripts

*   `npm run dev`: Start development server.
*   `npm run build`: Production build.
*   `npm run lint`: Linting check.
*   `npm run preview`: Preview production build locally.

---

## 🛡️ Security
*   **Row Level Security (RLS)**: Your data is isolated at the database level.
*   **Environment Safety**: Critical keys are never committed to version control.
*   **Protected Routes**: Workspace actions are locked behind authentication for persistent data.

---

## 🤝 Contributing
Contributions are welcome!
1. Fork the repo.
2. Create your feature branch (`git checkout -b feature/NewFeature`).
3. Commit changes (`git commit -m 'Add NewFeature'`).
4. Push to the branch (`git push origin feature/NewFeature`).
5. Open a Pull Request.

---

## 📄 License
This project is open-source and available under the MIT License.

*Made with ❤️ by Mumukshu D.C*
