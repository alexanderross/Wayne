engine = ARGV[0]
engine ||= "winston";
# Compress JS

# not now...

# Embed templates into main html
bin_laden = "../bin";
hub_file = File.open("#{bin_laden}/wayne.html", "w");
hub_file.write("<script src='wayne.js'></script>");


dirpath = "#{bin_laden}/UI/html_templates/export"
puts Dir.entries(dirpath)
Dir.entries(dirpath).each do |file|
  next if file[0] == "."
  hub_file.write("<div id='template_#{file}'>")
  hub_file.write(File.open(File.join([dirpath,file,engine+".html"])).read())
  hub_file.write("</div>\n")
end