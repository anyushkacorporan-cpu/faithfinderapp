path = '/Users/AnyushkaAriesCorporan/Desktop/FaithFinderApp/app/(tabs)/events.tsx'
with open(path, encoding='utf-8') as f:
    content = f.read()

old = """              {event.bannerImage ? (
                <ImageBackground source={{uri: event.bannerImage}} style={s.cardBanner} resizeMode="cover">
                <View style={{position:'absolute',top:12,right:12,backgroundColor:COLORS.green,borderRadius:6,paddingHorizontal:10,paddingVertical:4}}>
                    <Text style={{color:COLORS.white,fontSize:11,fontWeight:'700',letterSpacing:0.5}}>NEARBY</Text>
                  </View>
                </ImageBackground>
              ) : (
                <LinearGradient colors={gradient} style={s.cardBanner} start={{x:0,y:0}} end={{x:1,y:1}}>
                <View style={{position:'absolute',top:12,right:12,backgroundColor:COLORS.green,borderRadius:6,paddingHorizontal:10,paddingVertical:4}}>
                    <Text style={{color:COLORS.white,fontSize:11,fontWeight:'700',letterSpacing:0.5}}>NEARBY</Text>
                  </View>
                </LinearGradient>"""

new = """              {event.bannerImage ? (
                <ImageBackground source={{uri: event.bannerImage}} style={s.cardBanner} resizeMode="cover">
                {nearbyEvents.some((ne) => ne.id === event.id) && (
                <View style={{position:'absolute',top:12,right:12,backgroundColor:COLORS.green,borderRadius:6,paddingHorizontal:10,paddingVertical:4}}>
                    <Text style={{color:COLORS.white,fontSize:11,fontWeight:'700',letterSpacing:0.5}}>NEARBY</Text>
                  </View>
                )}
                </ImageBackground>
              ) : (
                <LinearGradient colors={gradient} style={s.cardBanner} start={{x:0,y:0}} end={{x:1,y:1}}>
                {nearbyEvents.some((ne) => ne.id === event.id) && (
                <View style={{position:'absolute',top:12,right:12,backgroundColor:COLORS.green,borderRadius:6,paddingHorizontal:10,paddingVertical:4}}>
                    <Text style={{color:COLORS.white,fontSize:11,fontWeight:'700',letterSpacing:0.5}}>NEARBY</Text>
                  </View>
                )}
                </LinearGradient>"""

count = content.count(old)
print('occurrences found:', count)
if count == 1:
    content = content.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Patched successfully')
else:
    print('Did NOT patch - pattern not found exactly once')
