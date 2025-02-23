const apiKey = "a9decdfd687ef46c99db100348758882";

export async function fetchWeatherData(lat, lng) {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
        const weatherData = await response.json();
        updateWeatherDisplay(weatherData);
    } catch (error) {
        console.error("Error fetching weather data:", error.message);
    }
}

export function updateWeatherDisplay(weatherData) {
    const {temp, feels_like, humidity} = weatherData.main;
    const {description, icon} = weatherData.weather[0];
    const windSpeed = (weatherData.wind.speed * 3.6).toFixed(1);

    document.getElementById('weather-condition').innerText = description;
    document.getElementById('temperature').innerHTML = `Temperature: <span>${temp}°C</span>`;
    document.getElementById('feels-like').innerHTML = `Feels like: <span>${feels_like}°C</span>`;
    document.getElementById('humidity').innerHTML = `Humidity: <span>${humidity}%</span>`;
    document.getElementById('wind-speed').innerHTML = `Wind speed: <span>${windSpeed} km/h</span>`;
    document.getElementById('weather-icon').src = `https://openweathermap.org/img/wn/${icon}@2x.png`;
    document.getElementById('weather-icon').alt = description;

    const weatherQuotes = {
        "clear sky": "The sun is shining, the sky is blue, and it's a perfect day to be outside. Don't forget your sunglasses.",

        "few clouds": "Just a few fluffy clouds floating around. Plenty of sunshine, but a little shade here and there.",

        "scattered clouds": "A mix of sun and clouds. Not too bright, not too gloomy—just the right balance.",
        "broken clouds": "Clouds are taking over, but the sun is still peeking through now and then.",

        "overcast clouds": "A full cloud blanket covering the sky. No sun in sight, but still a great day for a cozy moment.",

        "light rain": "Just a drizzle, enough to make the ground damp. A hoodie should be enough to keep you dry.",
        "moderate rain": "Steady rain falling, but nothing too intense. A good time for a warm drink indoors or a raincoat outside.",
        "heavy intensity rain": "A real downpour. If you’re heading out, grab an umbrella and some waterproof shoes.",
        "very heavy rain": "The kind of rain that soaks you instantly. Best to stay inside unless you absolutely have to go out.",
        "extreme rain": "A major rainstorm is here. Flooding could happen, so be careful on the roads.",

        "light intensity shower rain": "A quick, light shower passing through. It might be over before you even grab an umbrella.",
        "shower rain": "Off-and-on rain that comes in waves. You might get lucky and miss it, or you might get caught in the middle of it.",
        "heavy intensity shower rain": "Short but intense bursts of rain. Expect to get drenched if you step outside without cover.",
        "ragged shower rain": "Unpredictable showers. One minute it’s dry, the next it’s pouring—Mother Nature is keeping you on your toes.",

        "thunderstorm": "Rumbles in the sky, flashes of lightning, and rain coming down. Stay inside if you can.",
        "thunderstorm with light rain": "A bit of rain mixed with some thunder. Nothing too scary, but best to stay dry.",
        "thunderstorm with rain": "Heavy rain plus thunder and lightning. A classic stormy night in the making.",
        "thunderstorm with heavy rain": "A full-blown storm with downpours, booming thunder, and bright flashes of lightning.",

        "light snow": "Just a gentle dusting of snowflakes falling. It might not stick, but it’s pretty to watch.",
        "snow": "A steady snowfall, enough to make the world look like a winter wonderland.",
        "heavy snow": "Thick snow coming down fast. Great for snowball fights, but not so fun for driving.",
        "sleet": "A messy mix of snow and rain. Not the prettiest kind of winter weather, but at least it's not freezing rain.",
        "light shower sleet": "️A quick burst of sleet, but it won’t last too long.",
        "shower sleet": "Chilly and wet, sleet is falling in bursts. Roads might be slippery, so be careful.",
        "light rain and snow": "A little bit of rain, a little bit of snow. Too wet for a snowman, but still chilly.",
        "rain and snow": "A cold mix of rain and snow falling together. You’ll want a warm coat and waterproof shoes.",
        "light shower snow": "A little flurry of snow that comes and goes.",
        "shower snow": "Snow is falling in bursts. It might pile up quickly, so get ready for a wintery scene.",
        "heavy shower snow": "️Thick waves of snow falling fast. Everything could be covered in no time.",

        "mist": "A light haze in the air. It might make everything look dreamy and soft.",
        "smoke": "️The air is thick with smoke. If you're sensitive, try to stay indoors.",
        "haze": "A light foggy blur, making the world look a little softer.",
        "sand/dust whirls": "Wind is kicking up sand and dust. It might sting your face a bit, so cover up if you’re outside.",
        "fog": "️A thick blanket of fog is rolling in. Drive carefully and watch your step—it’s easy to get lost in the mist.",

        "sand": "Strong winds are carrying sand through the air. If you're outside, protect your face and eyes.",
        "dust": "Dust is swirling around, making the air dry and gritty.",
        "volcanic ash": "Volcanic ash in the air. If you're near an eruption, stay safe and indoors.",
        "squalls": "Sudden, strong winds coming out of nowhere. Hold onto your hat.",
        "tornado": "Dangerous weather ahead. Seek shelter immediately and stay updated on the latest warnings.",

        "unknown": "The weather is doing something unusual today. Maybe check outside and see for yourself."

    };

    const quoteBox = document.getElementById("weather-quote");

    if (weatherQuotes[description]) {
        quoteBox.innerText = weatherQuotes[description];
    } else {
        quoteBox.innerText = weatherQuotes.default;
    }
}