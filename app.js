const express = require('express')
const app = express()
const port = 3000

const { Client } = require('elasticsearch')
const client = new Client({ host: 'http://52.172.26.84' })

app.get('/', (req, res) => {
    client.ping().then((result) => console.log(result))
    client.search({index: "rb_locations",
        body: {
            query: {
                bool: {
                    must: {match_all: {}},
                    filter: {
                        bool: {
                            must: [
                                {term: {cityId: 1}},
                                {terms: {menuId: [117, 125, 93]}},
                                {
                                     geo_bounding_box: {
                                         "rb_pin": {
                                             bottom_left: {lat: 11.9796734, lon: 77.5890556},
                                             top_right: {lat: 13.1909909, lon: 76.3427979}
                                         }
                                     }
                                }
                            ]
                        }
                    }
                }
            },
            size: 100,
            _source: ["id", "lat", "lng", "total", "type", "data", "wardName", "cityName", "icon", "menuId"]
            }
    }).then((body) => res.json(body.hits.hits))
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
