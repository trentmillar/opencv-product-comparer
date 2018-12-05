# OpenCV Product Comparer
Want to be a killer Amazon seller? Well so did I. This is a crude, rude, slow, and disk heavy crawler to find you the unicorn product to sell on Amazon. Using OpenCV and scraping products off both Amazon &amp; AliExpress in hopes of finding the products you can make lots of money selling. Good Luck!

### Purpose
My wife wanted to sell some products on Amazon, I thought I would spend the weekend building this to help. 
 
What it is this...This tool will populate a MongoDB collection "categories" containing all the official categories used in Amazon's database. Then you define the category you want to find products that have a good profit margin. Using Amazon's Product API, it pages through products and downloads images of each product. At the same time, it is scraping images matching certain criteria off AliExpress. Then OpenCV will try to find the cheapest version of the Amazon product for sale on AliExpress. A "Match" document is created that shows the degree of similarity between products.

Ideally you will find products on Amazon that are also for sale on AliExpress, likely at a price that makes it profitable to buy them in bulk and then sell on Amazon.

### TODO
Lots including forking processes to make it run concurrently.

### History
I created this back in early 2015 wanted to archive it before cleaning it off my MBP.

### How To Use
- You will need MongoDB either local or hosted.
- Make sure you have a client & secret key to Amazon's Product API (I think the name may have changed) (Not sure Amazon still has or exposes this service as expected)
- If running local you will need OpenCV in your PATH. I tested on 2.4.11 with success and 3.0.0 with some success. Sorry, I haven't ran this in years so I am going off recollections
- Lastly, since OpenCV is not a service, the comparer will download images from both Amazon & AliExpress locally and compare them. 
