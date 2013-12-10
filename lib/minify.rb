require 'net/http'
require 'uri'


def minify_js(read_file)

  raw_contents = File.open(read_file, "rb").read

  uri = URI('http://jscompress.com')
  req = Net::HTTP::Post.new(uri)
  req['Accept'] = "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
  req['Content-Type']= "multipart/form-data;"
  req['User-Agent']= "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/30.0.1599.101 Safari/537.36"
  req['Origin']= "http://jscompress.com"
  req['Referer']= "http://jscompress.com/"
  req['Host']= "jscompress.com"
  req['Cookie'] = "__utma=89959296.1550008175.1383591009.1383591009.1383954061.2; __utmb=89959296.7.10.1383954061; __utmc=89959296; __utmz=89959296.1383954061.2.2.utmcsr=google|utmccn=(organic)|utmcmd=organic|utmctr=(not%20provided)"

  req.set_form_data('js_in'=>raw_contents)

  res = Net::HTTP.start(uri.hostname, uri.port) do |http|
    http.request(req)
  end
  puts "Compressing injection script"
  case res
  when Net::HTTPSuccess, Net::HTTPRedirection
    body = res.body.split("id=\"js_out\" rows=\"40\" cols=\"80\">")[1]
    body = body.split("</textarea></p>")[0]
    File.open(read_file+".min", 'w') {|f| f.write(body.gsub("&quot;","\"").gsub("&gt;",">").gsub("&lt;","<")) }
  else
    puts "Something went horridly wrong. Here's what I got back... Sorry..."
    puts res.value
  end
end