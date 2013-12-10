require '../lib/minify.rb'

engine = ARGV[0]
engine ||= "winston";
# Compress JS

compress = (ARGV[1])

# not now...

# Embed templates into main html
bin_laden = "../bin";
hub_file = File.open("#{bin_laden}/wayne.html", "w");

puts "Packing Extension default data - not minimizing"

dirpath = "#{bin_laden}/UI/html_templates/js_data"
puts Dir.entries(dirpath)
Dir.entries(dirpath).each do |file|
  next if file[0] == "."
  hub_file.write("<script type='text/javascript'>")
  hub_file.write(File.open(File.join([dirpath,file])).read())
  hub_file.write("</script>\n")
end

puts "Packing Main base driver"
hub_file.write("<script src='wayne.js'></script>");

puts "Packing Templates"
dirpath = "#{bin_laden}/UI/html_templates/export"
Dir.entries(dirpath).each do |file|
  next if file[0] == "."
  hub_file.write("<div id='template_#{file}'>")
  hub_file.write(File.open(File.join([dirpath,file,engine+".html"])).read())
  hub_file.write("</div>\n")
end

puts "Done packing"