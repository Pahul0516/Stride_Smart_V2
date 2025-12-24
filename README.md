# 🏙️ Stride Smart

**Stride Smart** is a smart walking-route recommendation application designed specifically for **Cluj-Napoca**. The app helps users discover the most suitable walking routes based on **environmental, safety, accessibility, and personal comfort criteria**, making urban walking healthier, safer, and more inclusive.

🔗 **Live application:**  
https://www.scs.ubbcluj.ro/projects/2/

---

## 📌 Project Overview

Stride Smart recommends walking routes by analyzing multiple spatial and environmental datasets. Users can choose between different criteria — or combine them — to generate routes tailored to their needs, preferences, and physical abilities.

The app is useful for:
- Daily commuters  
- Tourists and visitors  
- People sensitive to air quality or temperature  
- People with mobility impairments  
- Anyone who wants a safer or greener walking experience  

---

## 🚶‍♂️ Route Recommendation Criteria

### 🌡️ Thermal Comfort
To estimate how comfortable a street feels in terms of temperature:
- **12 raster datasets** are used  
- For each season, we use **3 rasters**:
  - Morning  
  - Noon  
  - Evening  
- These rasters help determine whether a street feels hot or cold at a given time and season.

---

### 🌬️ Clean Air
- Integrated an API providing **real-time air quality data**
- Data comes from **24 air-quality sensors** located across Cluj-Napoca
- Routes are optimized to avoid highly polluted areas

---

### 🌿 Nature Path
- Data provided by the **Cluj-Napoca Mayor’s Office**
- Multiple rasters containing information about:
  - Green spaces  
  - Trees  
  - Water bodies  
  - Natural areas  
- Routes prioritize greener and more natural environments

---

### 🚦 Safety Trail
- Based on a dataset of city streets
- Each street has a **safety index** derived from reported car accidents
- Streets with higher accident rates are penalized in route calculation

---

### ♿ Accessible Adventure
Designed for people with disabilities or reduced mobility:
- Streets are categorized based on **slope**
- Higher slope ⇒ lower probability of being chosen
- Helps avoid steep streets that are hard to access
- Uses the **A\*** pathfinding algorithm

---

### 🔀 Combined Criteria
All criteria can be combined.  
For example:
- *Safest + Greenest*
- *Clean Air + Thermal Comfort*
- *Accessible + Safe*

The routing algorithm adapts dynamically to user-selected preferences.

---

## 🧭 Discover & Explore Mode

This feature is designed especially for tourists and visitors:
- Users can explore **selected points of interest** in the city
- The goal is to visit all points in the **shortest possible path**
- We used **Ant Colony Optimization** to solve a variation of the **Traveling Salesman Problem (TSP)**
  - Necessary due to the high number of points
  - Traditional algorithms would be too slow

---

## 🚨 Reporting System

Users can actively contribute to city safety by reporting:
- Potholes  
- Street hazards  
- Accidents  
- Other urban issues  

These reports help improve future routing and urban awareness.

---

## 🛠️ Tech Stack

### Backend
- Python  
- Flask  
- PostgreSQL  
- PostGIS extension  
  - Enables storage and processing of:
    - Geospatial data  
    - Raster datasets  
    - Spatial queries  

### Frontend
- HTML  
- CSS  
- JavaScript  
- Tailwind CSS  

---

## 📊 Marketing Research & User Validation

To validate the concept and usefulness of **Stride Smart**, we conducted a marketing research study with **57 respondents**.

### Key Findings
- **90%** of respondents were between **18 and 34 years old**
- **87%** of participants stated that they **would use the application in the future**

### Insights
The results indicate strong interest among young adults, particularly those who are active, environmentally aware, and frequent users of urban mobility applications. The high intention-to-use percentage suggests that Stride Smart addresses real user needs related to comfort, safety, accessibility, and city exploration.

This research supports the feasibility and potential adoption of the application in a real-world urban environment.

---

## 🎥 Demo Videos

The following videos present both a user-oriented overview and a technical demonstration of the **Stride Smart** application:

### 📹 [Video One – User Guide & Marketing Overview](https://drive.google.com/file/d/1J4tnx_AtbF_pFs9qpSYQQkoOnif0lnqW/view?usp=sharing)
This video is designed for end users and marketing purposes. It explains how a user should interact with the application, showcasing the user experience, navigation flow, and the benefits of using Stride Smart for daily walking and city exploration.

### 📹 [Video Two – Application Functionalities & Technical Workflow](https://drive.google.com/file/d/1yDOEgLTEihfS1Z_RXvUHKsVtW5uZXfT-/view?usp=sharing)
This video focuses on the internal functionalities of the application, demonstrating how route recommendations are generated based on different criteria, how combined preferences work, and how the Discover & Explore and reporting features are implemented.

---

## 🏁 Conclusion

Stride Smart combines **GIS data**, **environmental analytics**, and **optimization algorithms** to create a smart, inclusive, and sustainable walking experience in Cluj-Napoca. By integrating real-world data and advanced routing techniques, the app promotes healthier urban mobility and smarter city exploration.
