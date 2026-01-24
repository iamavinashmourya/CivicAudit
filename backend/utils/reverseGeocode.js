const axios = require('axios');

/**
 * Reverse geocode coordinates to get location name
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<string>} Location name
 */
async function reverseGeocode(lat, lng) {
  try {
    if (!lat || !lng) {
      return 'Unknown Location';
    }

    // Using OpenStreetMap Nominatim API (free, no API key required)
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'CivicAudit/1.0' // Required by Nominatim
        },
        timeout: 5000 // 5 second timeout
      }
    );

    const data = response.data;

    if (!data || !data.address) {
      return 'Unknown Location';
    }

    const address = data.address;
    let location = '';

    // Try to build a meaningful location name
    // Priority: road > locality > suburb > city > town > village > county > state
    if (address.road || address.street) {
      location = address.road || address.street;
      if (address.suburb || address.neighbourhood || address.locality) {
        location += `, ${address.suburb || address.neighbourhood || address.locality}`;
      } else if (address.city || address.town) {
        location += `, ${address.city || address.town}`;
      }
    } else if (address.locality) {
      location = address.locality;
      if (address.city || address.town) {
        location += `, ${address.city || address.town}`;
      } else if (address.county || address.district) {
        location += `, ${address.county || address.district}`;
      }
    } else if (address.suburb || address.neighbourhood) {
      location = address.suburb || address.neighbourhood;
      if (address.city || address.town) {
        location += `, ${address.city || address.town}`;
      }
    } else if (address.city) {
      location = address.city;
      if (address.county || address.district) {
        location = `${address.city}, ${address.county || address.district}`;
      }
    } else if (address.town) {
      location = address.town;
      if (address.county || address.district) {
        location = `${address.town}, ${address.county || address.district}`;
      }
    } else if (address.village) {
      location = address.village;
      if (address.city || address.town) {
        location += `, ${address.city || address.town}`;
      }
    } else if (address.county || address.district) {
      location = address.county || address.district;
      if (address.state) {
        location += `, ${address.state}`;
      }
    } else if (address.state) {
      location = address.state;
    } else if (data.display_name) {
      // Fallback: parse display_name
      const parts = data.display_name.split(',');
      if (parts.length >= 2) {
        location = parts.slice(0, 2).join(', ').trim();
      } else {
        location = parts[0] || 'Unknown Location';
      }
    } else {
      location = 'Unknown Location';
    }

    return location || 'Unknown Location';
  } catch (error) {
    console.error('[Reverse Geocode] Error:', error.message);
    return 'Unknown Location';
  }
}

module.exports = { reverseGeocode };
