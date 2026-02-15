import csv
import math

#Calculates and returns the distance between two latitude longitude points in miles
def haversine(lat1, lon1, lat2, lon2):
    R = 3958.8  # Earth radius in miles
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return 2 * R * math.asin(math.sqrt(a))

#Loads csv data
def load_pois(filename):
    pois = []
    with open(filename, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            pois.append({
                "name": row["name"],
                "lat": float(row["@lat"]),
                "lon": float(row["@lon"]),
                "type": row["type"]
            })
    return pois

#Generates a list of gas stations within the given fuel range, returns the top 10 closest
def recommend_gas(current_lat, current_lon, fuel_range, gas_stations):
    recommendations = []
    
    for station in gas_stations:
        distance = haversine(current_lat, current_lon, station["lat"], station["lon"])
        
        #only stations withing the  fuel range will be considered
        if distance <= fuel_range:
            recommendations.append((station["name"], distance, station["lat"], station["lon"], station["type"]))
    
    #Sort by the closest
    recommendations.sort(key=lambda x: x[1])
    return recommendations[:10]  

#Generates a list of gas stations within the given fuel range, returns the top 10 closest
def recommend_rest(current_lat, current_lon, fuel_range, hours_driven, rest_threshold, rest_stops):
    if hours_driven < rest_threshold:
        return []  #nothing is returned if hours driven has not met the rest threshold yet 
    
    recommendations = []
    
    for stop in rest_stops:
        distance = haversine(current_lat, current_lon, stop["lat"], stop["lon"])
        
        if distance <= fuel_range:
            recommendations.append((stop["name"], distance, stop["lat"], stop["lon"], stop["type"]))
    
    #Sort by the closest
    recommendations.sort(key=lambda x: x[1])
    return recommendations[:10]

#Generates a list of hotels and motels within the given fuel range, returns the top 10 closest
def recommend_hotel(current_lat, current_lon, fuel_range, hotels, is_night):
    recommendations = []
    if is_night == "no":
        return []
    
    for hotel in hotels:
        distance = haversine(current_lat, current_lon, hotel["lat"], hotel["lon"])

        if distance <= fuel_range:
            recommendations.append((hotel["name"], distance, hotel["lat"], hotel["lon"], hotel["type"]))
    
    #Sort by the closest
    recommendations.sort(key=lambda x: x[1])
    return recommendations[:10]