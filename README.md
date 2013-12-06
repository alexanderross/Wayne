Wayne
===
_it's a tool. For testing_     

---
  


### Installing

As it stands, Wayne has two different installation options.

-Regular: Only runs on local URL's. This is useful in that the injection script doesn't go into every other damn page in chrome.

-Expanded: The script is injected, and the tool is available in any webpage on chrome. This is useful while testing Wayne's questionable robustness.

Each of this is generated from a specific manifest file under lib/. To create your own type of installation, simply make your own manifest in lib with a unique name, and run ./build.sh. An installation directory named after your manifest will be created in /install, and the .crx will reflect your own speciall install .crx. Look at you....

The .crx is the actual install file. 

To install, go to the install folder and open whatever type you want to install. Inside of that folder is a wayne.crx and a wayne.pem. Don't worry about the .pem (TODO: Tell people to worry about the keyfile). 

With chrome's extension page open, drag the .crx file into it. Say yes to the permissions. You can trust me. 


### Using

So after you've installed, there's this smug fucking raccoon in your extensions bar. When you're at a place where your integration test should start, click him. 

At this point, the bar shows up wherever the options depict it (default bottom right)
Time doesn't grow on trees - It grows in them. I'll write the rest of this out when I have time.




