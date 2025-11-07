import { useEffect, useState } from "react";
import { submitConnectionPreferences } from "../background/infra/helper";

const BIG_TECH_COMPANIES = [
  "Google", "Microsoft", "Apple", "Amazon", "Meta (Facebook)",
  "Netflix", "Tesla", "Nvidia", "Oracle", "Salesforce",
  "Adobe", "Intel", "IBM", "Cisco", "Uber",
  "Airbnb", "Twitter", "LinkedIn", "Snap", "Pinterest"
];

export default function Connection() {
  const [school, setSchool] = useState("");
  const [major, setMajor] = useState("");
  const [goal, setGoal] = useState("");
  const [companies, setCompanies] = useState([]);
  const [customCompany, setCustomCompany] = useState("");
  const [timePerDay, setTimePerDay] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    chrome.storage.local.get(["user_id"], (result) => {
      setUserId(result.user_id ?? null);
    });
  }, []);

  const handleCompanyToggle = (company) => {
    setCompanies((prev) =>
      prev.includes(company)
        ? prev.filter((c) => c !== company)
        : [...prev, company]
    );
  };

  const showCompanyField = goal === "1" || goal === "2";

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!userId) {
      setStatus({ type: "error", message: "Missing user ID. Please log in again." });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    const customEntries = customCompany
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    const combinedCompanies = showCompanyField
      ? [...companies, ...customEntries]
      : [];

    const payload = {
      user_id: userId,
      user_school: school,
      user_major: major,
      user_goal: goal,
      user_month_goal: timePerDay,
      user_companies_goal: combinedCompanies.join(", "),
      user_email: email,
    };

    try {
      const result = await submitConnectionPreferences(payload);
      if (result && result.ok) {
        setStatus({ type: "success", message: "Preferences saved!" });
      } else {
        setStatus({ type: "error", message: result?.error?.message ?? "Failed to save." });
      }
    } catch (error) {
      setStatus({ type: "error", message: error?.message ?? "Failed to save." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6 text-gray-900">
        this is ur daily networking tool
      </h1>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            School
          </label>
          <input
            type="text"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            placeholder="Enter your school"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Major
          </label>
          <input
            type="text"
            value={major}
            onChange={(e) => setMajor(e.target.value)}
            placeholder="Enter your major"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Goal
          </label>
          <select
            value={goal}
            onChange={(e) => {
              const value = e.target.value;
              setGoal(value);
              if (value === "3") {
                setCompanies([]);
                setCustomCompany("");
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="">Select a goal</option>
            <option value="1">i want to find a internship</option>
            <option value="2">full time job</option>
            <option value="3">just connection for now</option>
          </select>
        </div>

        {showCompanyField && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What companies u r targeting
            </label>
            <p className="text-sm text-gray-500 mb-3">
              (leave it blank if u r ok with any companies)
            </p>

            <div className="mb-4">
              <div className="grid grid-cols-2 gap-2 mb-3">
                {BIG_TECH_COMPANIES.map((company) => (
                  <label
                    key={company}
                    className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={companies.includes(company)}
                      onChange={() => handleCompanyToggle(company)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{company}</span>
                  </label>
                ))}
              </div>
            </div>

            <input
              type="text"
              value={customCompany}
              onChange={(e) => setCustomCompany(e.target.value)}
              placeholder="Or enter custom company names (comma separated)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            How much time would u want daily recommendations to be?
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={timePerDay}
              onChange={(e) => setTimePerDay(e.target.value)}
              placeholder="Enter number"
              min="0"
              className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-sm text-gray-600">months</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-black text-white rounded-md disabled:opacity-60"
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </div>

        {status && (
          <p className={`text-sm ${status.type === "success" ? "text-green-600" : "text-red-600"}`}>
            {status.message}
          </p>
        )}
      </form>
    </div>
  );
}

