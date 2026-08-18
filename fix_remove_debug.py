path = '/Users/AnyushkaAriesCorporan/Desktop/FaithFinderApp/src/lib/translate.ts'
with open(path, encoding='utf-8') as f:
    content = f.read()

old = """    const data = await res.json();
    console.log('DEBUG detectLanguage response:', JSON.stringify(data));
    return data?.data?.detections?.[0]?.[0]?.language || null;
  } catch (e) {
    console.log('DEBUG detectLanguage error:', e);
    return null;
  }
}"""
new = """    const data = await res.json();
    return data?.data?.detections?.[0]?.[0]?.language || null;
  } catch {
    return null;
  }
}"""
c = content.count(old)
print('occurrences:', c)
if c == 1:
    content = content.replace(old, new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
