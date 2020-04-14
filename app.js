const express = require('express')
const app = express()
const port = 3000

const { Client } = require('elasticsearch')
const client = new Client({ host: 'localhost:9200' })

// app.use(function(req, res, next) {
//    res.header("Access-Control-Allow-Origin", "http://localhost:4200"); // update to match the domain you will make the request from
//    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//    next();
// });

entitySearchSortByDistance = function(res, cityId, level, menuIds, latitude, longitude, top_left, bottom_right) {
    if (!menuIds || menuIds.length == 0) {
        res.json({
		data: [],
		success: true,
		message: "Data sent successfully",
	});
    }

    let filter = (menuIds instanceof Array) ?
            [{terms: {menuId: menuIds}}] :
            [{term: {menuId: menuIds}}];

    if (cityId) {
        filter.push({term: {cityId: cityId}})
    }

    if (top_left.lat && bottom_right.lat) {
        filter.push({
		geo_bounding_box: {
			rb_pin: {
				top_left: top_left,
				bottom_right: bottom_right
			},
		}
        });
    }

    sort_by = []
    if (latitude) {
        sort_by.push({
	    _geo_distance: {
                rb_pin: {
		    lat: latitude,
		    lon: longitude
		},
		order : "asc",
		distance_type: "plane"
	    }
	});
    }

    client.search({
        index: "rb_locations",
        size: 1000,
        _source: ["id", "lat", "lng", "total", "type", "data", "wardName", "cityName", "icon", "menuId"],
        body: {
            query: {
                bool: {
                    filter: filter
                }
            },
	    sort: sort_by,
        }
    }).then((body) => {
        this.hits = body.hits.hits
        console.log("No results =" + hits.length)
        res.json({
		data: body.hits.hits.map(d => d["_source"]),
		success: true,
		message: "Data sent successfully",
	})
        // console.log(this.hits)
    })
}

categoryCounts = function(res, cityId, menuIds, latitude, longitude, radius, top_left, bottom_right) {
    if (!menuIds || menuIds.length == 0) {
        res.json({
		data: [],
		success: true,
		message: "Data sent successfully",
	});
    }

    // If only one param is sent it comes as a scalar
    menuIds = (menuIds instanceof Array) ?  menuIds : [menuIds];

    var countPromises = []
    menuIds.forEach((menuId, index) => {
        let filter = [{term: {menuId: menuId}}];
        if (cityId) {
            filter.push({term: {cityId: cityId}})
        }

        if (top_left.lat && bottom_right.lat) {
            filter.push({
                geo_bounding_box: {
                    rb_pin: {
                        top_left: top_left,
                        bottom_right: bottom_right
                    },
                }
            });
        }

        if (latitude && longitude && radius) {
            filter.push({
                geo_distance: {
		    distance: radius,
                    rb_pin: {
			lat: latitude,
                        lon: longitude
                    },
                }
            });
	    console.log(filter);
        }

        countPromises.push(client.count({
            index: "rb_locations",
            body: {
                query: {
                    bool: {
                        filter: filter
                    }
                },
	    }
        }))
    });

    Promise.all(countPromises).then((results) => {
        let data = [];
	results.forEach((r, index) => data.push({menuData: menuIds[index], count: r.count}));
        res.json({
            data: data,
            success: true,
            message: "Data sent successfully",
        });
        console.log(results);
    });
}

app.get('/places', (req, res) => {
    let cityId = req.query.cityId;
    let level = req.query.level;
    let menuIds = req.query.menuData;
    let top_left = {lat: req.query.topLeftLat, lon: req.query.topLeftLon}
    let bottom_right = {lat:req.query.bottomRightLat, lon: req.query.bottomRightLon};
    latitude = req.query.latitude
    longitude = req.query.longitude
    console.log(res, cityId, level, menuIds, top_left, bottom_right)
    entitySearchSortByDistance(res, cityId, level, menuIds, latitude, longitude, top_left, bottom_right)
    return 0;
});

app.get('/categoryCounts', (req, res) => {
    let cityId = req.query.cityId;
    let menuIds = req.query.menuData;
    let top_left = {lat: req.query.topLeftLat, lon: req.query.topLeftLon}
    let bottom_right = {lat:req.query.bottomRightLat, lon: req.query.bottomRightLon};
    latitude = req.query.latitude
    longitude = req.query.longitude
    radius = req.query.radius
    console.log(res, cityId, menuIds, top_left, bottom_right)
    categoryCounts(res, cityId, menuIds, latitude, longitude, radius, top_left, bottom_right)

    return 0;
});



app.listen(port, () => console.log(`Example app listening on port ${port}!`))
