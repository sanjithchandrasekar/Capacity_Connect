import os
import emoji

def remove_emojis_from_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace emojis with nothing
    clean_content = emoji.replace_emoji(content, replace='')
    
    if clean_content != content:
        # Check what was removed
        print(f"Removed emojis from: {filepath}")
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(clean_content)

def walk_dir(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts') or file.endswith('.html'):
                remove_emojis_from_file(os.path.join(root, file))

if __name__ == '__main__':
    walk_dir('src')
    walk_dir('public')
    print("Done removing emojis.")
