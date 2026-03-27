CJ5257217@api@657a2043a3714fb5a6a1990c5e70e9f0				https://www.cjdropshipping.com/						
import Foundation										
let headers = [										
"x-rapidapi-key": "31483fa673msh0e14d62fd0ed716p13b1b2jsnaf34088dd1c8",										
"x-rapidapi-host": "alibaba-datahub.p.rapidapi.com",										
"Content-Type": "application/json"										
]										
let request = NSMutableURLRequest(url: NSURL(string: "https://alibaba-datahub.p.rapidapi.com/item_sku?itemId=1600798906682")! as URL,										
cachePolicy: .useProtocolCachePolicy,										
timeoutInterval: 10.0)										
request.httpMethod = "GET"										
request.allHTTPHeaderFields = headers										
let session = URLSession.shared										
let dataTask = session.dataTask(with: request as URLRequest, completionHandler: { (data, response, error) -> Void in										
if (error != nil) {										
print(error as Any)										
} else {										
let httpResponse = response as? HTTPURLResponse										
print(httpResponse)										
}										
})										
dataTask.resume()										
										
import Foundation										
let headers = [										
"x-rapidapi-key": "31483fa673msh0e14d62fd0ed716p13b1b2jsnaf34088dd1c8",										
"x-rapidapi-host": "aliexpress-business-api.p.rapidapi.com",										
"Content-Type": "application/json"										
]										
let request = NSMutableURLRequest(url: NSURL(string: "https://aliexpress-business-api.p.rapidapi.com/getcoupons.php")! as URL,										
cachePolicy: .useProtocolCachePolicy,										
timeoutInterval: 10.0)										
request.httpMethod = "GET"										
request.allHTTPHeaderFields = headers										
let session = URLSession.shared										
let dataTask = session.dataTask(with: request as URLRequest, completionHandler: { (data, response, error) -> Void in										
if (error != nil) {										
print(error as Any)										
} else {										
let httpResponse = response as? HTTPURLResponse										
print(httpResponse)										
}										
})										
dataTask.resume()										
										
import Foundation										
let headers = [										
"x-rapidapi-key": "31483fa673msh0e14d62fd0ed716p13b1b2jsnaf34088dd1c8",										
"x-rapidapi-host": "real-time-amazon-data.p.rapidapi.com",										
"Content-Type": "application/json"										
]										
let request = NSMutableURLRequest(url: NSURL(string: "https://real-time-amazon-data.p.rapidapi.com/top-product-reviews?asin=B00939I7EK&country=US")! as URL,										
cachePolicy: .useProtocolCachePolicy,										
timeoutInterval: 10.0)										
request.httpMethod = "GET"										
request.allHTTPHeaderFields = headers										
let session = URLSession.shared										
let dataTask = session.dataTask(with: request as URLRequest, completionHandler: { (data, response, error) -> Void in										
if (error != nil) {										
print(error as Any)										
} else {										
let httpResponse = response as? HTTPURLResponse										
print(httpResponse)										
}										
})										
dataTask.resume()										
										