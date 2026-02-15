from recommendation import load_pois, recommend_gas, recommend_rest, recommend_hotel
def main():
    try:
        current_lat = float(input("Enter current latitude: "))
        current_lon = float(input("Enter current longitude: "))
        fuel_range = float(input("Enter remaining fuel range (miles): "))
        hours_driven = float(input("Enter hours driven so far: "))
        is_night = input("Is it night right now?: ")
    except ValueError:
        print("Invalid input. Please enter numeric values.")
        return

    rest_threshold = 3  #test threshold, rest after 3 hours

    gas_stations = load_pois("public/gas_stations.csv")
    rest_stops = load_pois("public/rest_stops.csv")
    hotels = load_pois("public/hotels.csv")

    print("- Recommendations -\n")
    gas_recs = recommend_gas(current_lat, current_lon, fuel_range, gas_stations)
    rest_recs = recommend_rest(current_lat, current_lon, fuel_range, hours_driven, rest_threshold, rest_stops)
    hotel_recs = recommend_hotel(current_lat, current_lon, fuel_range, hotels, is_night)
    
    recommendations = hotel_recs + rest_recs + gas_recs
    #recommendations.sort(key=lambda x: x[1])
    recommendations = recommendations[0:10]

    name = ""
    for rec in recommendations:
        if rec[0] == "":
            if rec[4] == "fuel":
                name = "Gas Station"
            elif rec[4] == "rest":
                name  = "Rest Stop"
            elif rec[4] == "hotel":
                name  = "Hotel"
            elif rec[4] == "motel":
                name  = "Motel"
        else:
            name = rec[0]

        print(f"{name} ({rec[1]:.1f} miles away) Latitude: {rec[2]:1f} Longitude: {rec[3]:1f}")

if __name__ == "__main__":
    main()
    #33.50761089291749 
    #-117.7495340382386
    #used test coords