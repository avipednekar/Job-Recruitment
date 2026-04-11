import axios from "axios";

export const searchLocations = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ success: true, locations: [] });
    }

    const response = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: {
        q,
        format: "json",
        addressdetails: 1,
        countrycodes: "in", // currently scoped to India for performance, can be removed to be global
        limit: 5,
      },
      headers: {
        "User-Agent": "JobRecruitmentApp/1.0",
      },
    });

    // Format and deduplicate locations
    const locations = response.data
      .map((item) => {
        // Build a simplified string like "City, State, Country"
        const address = item.address;
        const city = address.city || address.town || address.village || address.state_district;
        const state = address.state;
        const country = address.country;
        
        let label = [];
        if (city) label.push(city);
        if (state && state !== city) label.push(state);
        if (country) label.push(country);

        return {
          id: item.place_id,
          name: label.join(", "),
          raw: item.display_name,
        };
      })
      .filter((loc) => loc.name)
      // Dedup by name
      .filter((v, i, a) => a.findIndex(t => (t.name === v.name)) === i);

    res.json({ success: true, locations });
  } catch (error) {
    console.error("Location Search Error:", error.message);
    res.status(500).json({ error: "Failed to fetch locations" });
  }
};
