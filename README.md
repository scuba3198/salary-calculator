# Nepali Salary Calculator

A modern, responsive React application designed to help users track their workdays and calculate monthly earnings with ease. Built with React, Vite, and Supabase, this tool features an intuitive calendar interface, organization management, and real-time salary statistics.

## ✨ Features

- **Authentication**: Secure user login and signup powered by Supabase Auth.
- **Organization Management**: Create, join, and switch between different organizations or workspaces.
- **Interactive Calendar**:
  - Visual calendar based on the Nepali date system (integration pending/in-progress or handled via `nepali-date-converter`).
  - Mark/unmark workdays directly on the calendar.
  - Visual indicators for weekends and holidays.
- **Salary Statistics**:
  - Real-time calculation of monthly earnings.
  - Track total days worked, holidays, and payable amount.
- **Responsive Design**: Fully optimized for desktop, tablet, and mobile devices.
- **Theme Support**: Seamless toggle between Light and Dark modes.

## 🛠️ Tech Stack

- **Frontend**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Backend/Database**: [Supabase](https://supabase.com/) (Auth & Postgres Database)
- **Styling**: Vanilla CSS (with CSS variables for theming)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Date Handling**: `nepali-date-converter`

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your local machine:
- [Node.js](https://nodejs.org/) (Version 16 or higher recommended)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/scuba3198/salary-calculator.git
   cd salary-calculator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

### Configuration

The application authenticates with a Supabase backend.
Currently, the Supabase credentials might be configured directly in `src/utils/supabase.js`.

For a production or custom setup, it is recommended to use environment variables. Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Running the Application

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the port shown in your terminal).

## 📜 Scripts

- `npm run dev`: Starts the development server with HMR.
- `npm run build`: Builds the application for production.
- `npm run lint`: Runs ESLint to check for code quality issues.
- `npm run preview`: Locally previews the production build.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is open source.
