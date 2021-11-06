const puppeteer = require('puppeteer');
const fs = require('fs'); 

(async () => {

  let url = "https://coinmarketcap.com/historical/";
  let max_rank = 1100;
  let write_to_path = "coinranks2.json"

  const browser = await puppeteer.launch({
    headless: false
  });

  const page = await browser.newPage();

  await page.goto(url);

  await page.setViewport({
    width: 1280,
    height: 800
  });

  let CMC_dates = await page.evaluate(()=>
  [...document.querySelectorAll("a.historical-link")].map(element => element.href.split('/')[4])
  );
 
  let stored_data={}, stored_coin_data={};

  //Get data for every CMC historical snapshot
  for(element of CMC_dates){
    await page.goto(url+element);
    await page.waitForTimeout(10000)
    let coin_list=await getCoinList(page, max_rank);
    //Store coin ranking data in object base on date
    stored_coin_data[element]=coin_list; 
  }
  
  
  stored_data={
    "start_date"  : CMC_dates[0],
    "end_date"    : CMC_dates[CMC_dates.length-1],
    "max_rank"    : max_rank,
    "data"        : stored_coin_data
  }

  storeData(stored_data,write_to_path);

  await browser.close();
})()


async function getCoinList(page, length){
  //while loop to click load more until amount of data points is 1000 or there are no more coins to load
  while (true) {
      //Autoscroll to bottom of page so all coins are loaded on Coinmarketcap
      await autoScroll(page);
      let coins = await page.evaluate(() =>
          [...document.querySelectorAll("td.cmc-table__cell--sort-by__symbol")].map(element => element.getElementsByTagName('div')[0].innerHTML));
      let number_of_coins=coins.length;
    
      if (number_of_coins<length){
        //Get load more button element
        const [load_more_button] = await page.$x("//div[@class='cmc-table-listing__loadmore']/button[contains(., 'Load More')]");
        
        //Exit if load more button doesn't exist in page (reached last coin in list) else click the button
        if (load_more_button){
          await load_more_button.click();
        }else{
          return coins;
        }
      }else{
        //return only the amount of coins specified
        return coins.slice(0,length);
      }
  }
} 


async function autoScroll(page){
  //Scoll till bottom of page
  await page.evaluate(async () => {
      await new Promise((resolve, reject) => {
          var totalHeight = 0;
          var distance = 100;
          var timer = setInterval(() => {
              var scrollHeight = document.body.scrollHeight;
              window.scrollBy(0, distance);
              totalHeight += distance;

              if(totalHeight >= scrollHeight){
                  clearInterval(timer);
                  resolve();
              }
          }, 20);
      });
  });
}


const storeData = (data, path) => {
  try {
    fs.writeFileSync(path, JSON.stringify(data))
  } catch (err) {
    console.error(err)
  }
}