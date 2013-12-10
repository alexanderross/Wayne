echo "Wrangling"
cd lib
ruby wrangle.rb
cd ../

echo "Building keys"
cd keys
./build_keys.sh wayne
cd ../

echo "Clearing current builds"
rm -rf install
mkdir install

echo "Building all manifests in lib/builds"
cd lib
cd builds
for file in *.json
do
 DEST="../../install/${file%.*}"
 echo "Packaging app in $DEST"
 rm ../../bin/manifest.json
 cp "$file" ../../bin/manifest.json
 mkdir $DEST
 ./../../crxbuild.sh ../../bin ../../keys/wayne.pem "$DEST/wayne.crx"
 cp ../../keys/wayne.pem "$DEST/wayne.pem"
done

echo "Chances are your console doesn't have a consistent chrome link. I can't load it into chrome automatically. sorry bro."
cd ../../

