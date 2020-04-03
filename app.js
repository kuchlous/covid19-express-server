const express = require('express')
const app = express()
const port = 3000

const { Client } = require('elasticsearch')
const client = new Client({ host: 'localhost:9200' })

 app.use(function(req, res, next) {
   res.header("Access-Control-Allow-Origin", "http://localhost:4200"); // update to match the domain you will make the request from
   res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
   next();
});

entitySearch = function(res, cityId, level, menuIds, top_left, bottom_right) {
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
        filter.push({geo_bounding_box:
            {
                top_left: top_left,
                bottom_right: bottom_right
            },
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

app.get('/places', (req, res, next) => {
    let cityId = req.query.cityId;
    let level = req.query.level;
    let menuIds = req.query.menuData;
    let top_left = {lat: req.query.topLeftLat, lon: req.query.topLeftLon}
    let bottom_right = {lat:req.query.bottomRightLat, lon: req.query.bottomRightLon};
    // latitude = req.query.latitude
    // longitude = req.query.longitude
    console.log(res, cityId, level, menuIds, top_left, bottom_right)
    entitySearch(res, cityId, level, menuIds, top_left, bottom_right)
    return 0;
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
