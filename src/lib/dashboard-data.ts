export const initialPeriodSettings = {
  lastPeriodStart: "2026-05-27",
  cycleLength: 27,
  periodLength: 5,
  lutealLength: 14,
  cycleStartHistory: ["2026-03-04", "2026-03-31", "2026-04-28", "2026-05-27"],
  dailySymptoms: [
    {
      date: "2026-06-12",
      cramps: true,
      headache: false,
      mood: "Mood swing ringan",
      cervicalFluid: "Lengket",
      basalTemperature: 36.5,
      stress: "Sedang",
      sleepHours: 7
    },
    {
      date: "2026-06-13",
      cramps: false,
      headache: false,
      mood: "Stabil",
      cervicalFluid: "Kering",
      basalTemperature: 36.4,
      stress: "Rendah",
      sleepHours: 8
    }
  ],
  symptoms: ["Mood swing ringan", "Butuh hidrasi", "Tidur cukup"],
  partnerReminder: "Siapkan vitamin dan rencana date ringan."
};

export const initialSavingsGoals = [
  {
    id: "wedding",
    name: "Tabungan Menikah",
    current: 0,
    target: 75000000,
    monthlyChange: 0
  },
  {
    id: "emergency",
    name: "Dana Darurat",
    current: 0,
    target: 30000000,
    monthlyChange: 0
  }
];

export const movies = [
  {
    title: "How to Train Your Dragon",
    rating: 7.8,
    genre: "Adventure",
    poster:
      "https://image.tmdb.org/t/p/w342/q5pXRYTycaeW6dEgsCrd4mYPmxM.jpg"
  },
  {
    title: "Lilo & Stitch",
    rating: 7.1,
    genre: "Family",
    poster:
      "https://image.tmdb.org/t/p/w342/tUae3mefrDVTgm5mRzqWnZK6fOP.jpg"
  },
  {
    title: "Mission: Impossible",
    rating: 7.4,
    genre: "Action",
    poster:
      "https://image.tmdb.org/t/p/w342/z53D72EAOxGRqdr7KXXWp9dJiDe.jpg"
  }
];
