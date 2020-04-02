const express = require('express')
const app = express()
const port = 3000

const { Client } = require('elasticsearch')
const client = new Client({ host: 'http://52.172.26.84' })

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "http://localhost:4200"); // update to match the domain you will make the request from
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

entitySearch = function(res, cityId, level, menuIds, top_left, bottom_right) {
    let filter = [{terms: {menuId: menuIds}}]
    if (cityId) {
        filter.push({term: {cityId: cityId}})
    }
    if (top_left && bottom_right) {
        filter.push({geo_bounding_box:
            {
                top_left: top_left,
                bottom_right: bottom_right
            },
        });
    }
    client.search({
        index: "rb_locations",
        size: 100,
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
        res.json(body.hits.hits)
        // console.log(this.hits)
    })
}

app.get('/', (req, res, next) => {
    console.log(req.query);
    let cityId = req.query.cityId;
    let level = req.query.level;
    let menuIds = req.query.menuData;
    let top_left = req.query.top_left;
    let bottom_right = req.query.bottom_right;
    // latitude = req.query.latitude
    // longitude = req.query.longitude
    console.log(res, cityId, level, menuIds, top_left, bottom_right)
    entitySearch(res, cityId, level, menuIds, top_left, bottom_right)
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
