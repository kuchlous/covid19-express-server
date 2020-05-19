const express = require('express')
const app = express()
app.use(express.urlencoded())
const port = 3000

const { Client } = require('elasticsearch')
const client = new Client({ host: 'localhost:9200' })

// app.use(function(req, res, next) {
//    res.header("Access-Control-Allow-Origin", "http://localhost:4200"); // update to match the domain you will make the request from
//    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//    next();
// });

createFilter = function(cityId, menuIds, latitude, longitude, radius, top_left, bottom_right, creator_org) {
    // If only one param is sent it comes as a scalar
    menuIds = (menuIds instanceof Array) ?  menuIds : [menuIds];

    let filter = [{terms: {menuId: menuIds}}]

    if (cityId) {
        filter.push({term: {cityId: cityId}})
    }

    if (creator_org) {
        filter.push({term: {creator_org: creator_org}})
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
    }
    return filter;
}

entitySearchSortByDistance = function(res, cityId, level, menuIds, latitude, longitude, radius, top_left, bottom_right, creator_org) {
    if (!menuIds || menuIds.length == 0) {
        res.json({
		data: [],
		success: true,
		message: "Data sent successfully",
	});
    }

    let filter = createFilter(cityId, menuIds, latitude, longitude, radius, top_left, bottom_right, creator_org)

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
        _source: ["id", "name", "category", "subcategory", "lat", "lng", "total", "type", "data", "wardName", "cityName", "icon", "menuId", "address", "impact", "closed_at", "closed_by", "phone", "created_by", "creator_org"],
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
        res.json({
		data: body.hits.hits.map(d => d["_source"]),
		success: true,
		message: "Data sent successfully",
	})
    })
}

returnOnePlace = function(res, id) {
    client.get({
        index: "rb_locations",
	id: id,
    }).then((body) => {
        res.json({
		data: body._source,
		success: true,
		message: "Data sent successfully",
	})
    })
}

categoryCounts = function(res, cityId, menuIds, latitude, longitude, radius, top_left, bottom_right, creator_org) {
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
        let filter = createFilter(cityId, menuId, latitude, longitude, radius, top_left, bottom_right, creator_org)
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
    });
}

categoryImpacts = function(res, cityId, menuIds, latitude, longitude, radius, top_left, bottom_right, creator_org) {
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
        let filter = createFilter(cityId, menuId, latitude, longitude, radius, top_left, bottom_right, creator_org)
        countPromises.push(client.search({
            index: "rb_locations",
            body: {
                query: {
                    bool: {
                        filter: filter
                    }
                },
                aggs: {
		    impact: { "sum" : { "field" : "impact" } }
                },
	    }
        }))
    });

    Promise.all(countPromises).then((results) => {
        let data = [];
	results.forEach((r, index) => data.push({menuData: menuIds[index], impact: r.aggregations.impact.value}));
        res.json({
            data: data,
            success: true,
            message: "Data sent successfully",
        });
    });
}

app.get('/places', (req, res) => {
    let id = req.query.id;
    let cityId = req.query.cityId;
    let level = req.query.level;
    let menuIds = req.query.menuData;
    let top_left = {lat: req.query.topLeftLat, lon: req.query.topLeftLon}
    let bottom_right = {lat:req.query.bottomRightLat, lon: req.query.bottomRightLon};
    let latitude = req.query.latitude
    let longitude = req.query.longitude
    let radius = req.query.radius
    let creator_org = req.query.creatorOrg
    if (id) {
      returnOnePlace(res, id);
      return 0
    }
    entitySearchSortByDistance(res, cityId, level, menuIds, latitude, longitude, radius, top_left, bottom_right, creator_org)
    return 0;
});

app.get('/categoryCounts', (req, res) => {
    let cityId = req.query.cityId;
    let menuIds = req.query.menuData;
    let top_left = {lat: req.query.topLeftLat, lon: req.query.topLeftLon}
    let bottom_right = {lat:req.query.bottomRightLat, lon: req.query.bottomRightLon};
    let latitude = req.query.latitude
    let longitude = req.query.longitude
    let radius = req.query.radius
    let creator_org = req.query.creatorOrg
    categoryCounts(res, cityId, menuIds, latitude, longitude, radius, top_left, bottom_right, creator_org)

    return 0;
});

app.get('/categoryImpacts', (req, res) => {
    let cityId = req.query.cityId;
    let menuIds = req.query.menuData;
    let top_left = {lat: req.query.topLeftLat, lon: req.query.topLeftLon}
    let bottom_right = {lat:req.query.bottomRightLat, lon: req.query.bottomRightLon};
    let latitude = req.query.latitude
    let longitude = req.query.longitude
    let radius = req.query.radius
    let creator_org = req.query.creatorOrg
    categoryImpacts(res, cityId, menuIds, latitude, longitude, radius, top_left, bottom_right, creator_org)

    return 0;
});

app.get('/creators', (req, res) => {
     client.search({
         index: "rb_creator_orgs",
         size: 1000,
         body: {
              query: {
                  match_all: {}
              }
         }
     }).then(body => {
          res.json({
              data: body.hits.hits.map(d => d["_source"]),
              success: true,
              message: "Data sent successfully",
	  })
     })
});

app.get('/containingWard', (req, res) => {
    let latitude = parseFloat(req.query.latitude)
    let longitude = parseFloat(req.query.longitude)

    client.search({
        index: "rb_wards",
        body: {
            query: {
                geo_shape: {
                    shape: {
                        shape: {
                            type: "point",
                            coordinates : [longitude, latitude]
                        },
                        relation: "intersects"
	            }
                }
            }
        }
    }).then((body) => {
        this.hits = body.hits.hits
        res.json({
		data: body.hits.hits.map(d => d["_source"]),
		success: true,
		message: "Data sent successfully",
	})
    })
});

app.post('/updatePlaceClosed', (req, res) => {
    let place_org_id = req.body.place_org_id;
    let closed_at = req.body.closed_at;
    let closed_by = req.body.closed_by;
    let subcategory = req.body.subcategory;
    console.log("updatePlaceClosed:" + "place_org_id = " + place_org_id + "closed_at = ", closed_at + "closed_by = ", closed_by);
    if (!place_org_id || 
        (!closed_by && !closed_at && !subcategory)) {
        res.json({
            success: false,
            message: "Missing argument, record not updated.",
        });
    }

    doc = { }
    if (closed_at) {
       doc["closed_at"] = closed_at
    }
    if (closed_by) {
       doc["closed_by"] = closed_by
    }
    if (subcategory) {
       doc["subcategory"] = subcategory
    }

    client.update({
        index: "rb_locations",
        id: place_org_id,
        body: {
            doc: doc
        }
    }).then(body => {
        res.json({
            success: true,
            message: "Record updated successfully",
        });
    }).catch(error => {
        console.log("Error: " + error);
        res.json({
            success: false,
            message: "ES error, record not updated." + error,
        });
    });
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
