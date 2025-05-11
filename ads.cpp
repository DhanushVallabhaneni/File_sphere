#include <iostream>
#include <fstream>
#include <string>
#include <unordered_map>
#include <filesystem>

using namespace std;
namespace fs = std::filesystem;

// Structure to hold file information
struct File {
    string name;
    string content;
    size_t size;
    string extension;
};

unordered_map<string, File> fileHashTable; // Hash table to store file names and their details

void searchByFileName(const string& fileName);
void searchByFileSize(size_t fileSize);
void searchByFileExtension(const string& fileExtension);

void createFile(const string& fileName) {
    ofstream file(fileName);
    if (file.is_open()) {
        cout << "File created successfully: " << fileName << endl;
        file.close();
        // Add entry to hash table
        File newFile;
        newFile.name = fileName;
        newFile.size = fs::file_size(fileName);
        newFile.extension = fs::path(fileName).extension().string();
        fileHashTable[fileName] = newFile;
    } else {
        cout << "Failed to create file: " << fileName << endl;
    }
}

void writeFile(const string& fileName) {
    ofstream file(fileName, ios::app);
    if (file.is_open()) {
        string content; // Declare content variable here
        string line;
        cout << "Enter content to write (Enter '$$' on a new line to stop):\n";
        while (true) {
            getline(cin, line);
            if (line == "$$") // User input '.' to stop writing
                break;
            content += line + "\n"; // Append line to content
        }
        file << content; // Write content to file
        cout << "Content written to file: " << fileName << endl;
        file.close();
        // Update entry in hash table
        fileHashTable[fileName].content = content;
    } else {
        cout << "Failed to write to file: " << fileName << endl;
    }
}

void readFile(const string& fileName) {
    auto it = fileHashTable.find(fileName);
    if (it != fileHashTable.end()) {
        cout << "Contents of file " << fileName << ":" << endl;
        cout << it->second.content << endl;
    } else {
        cout << "File not found: " << fileName << endl;
    }
}

void deleteFile(const string& fileName) {
    auto it = fileHashTable.find(fileName);
    if (it != fileHashTable.end()) {
        if (remove(fileName.c_str()) != 0) {
            cout << "Error deleting file: " << fileName << endl;
        } else {
            cout << "File deleted successfully: " << fileName << endl;
            // Remove entry from hash table
            fileHashTable.erase(it);
        }
    } else {
        cout << "File not found: " << fileName << endl;
    }
}

void searchFile() {
    int searchChoice;
    string fileName, fileExtension;
    size_t fileSize;

    cout << "Search Options:" << endl;
    cout << "1. Search by File Name" << endl;
    cout << "2. Search by File Size" << endl;
    cout << "3. Search by File Extension" << endl;
    cout << "Enter your choice: ";
    cin >> searchChoice;

    switch (searchChoice) {
        case 1:
            cout << "Enter file name to search: ";
            cin >> fileName;
            searchByFileName(fileName);
            break;
        case 2:
            cout << "Enter file size to search: ";
            cin >> fileSize;
            searchByFileSize(fileSize);
            break;
        case 3:
            cout << "Enter file extension to search: ";
            cin >> fileExtension;
            searchByFileExtension(fileExtension);
            break;
        default:
            cout << "Invalid choice" << endl;
            break;
    }
}

void searchByFileName(const string& fileName) {
    auto it = fileHashTable.find(fileName);
    if (it != fileHashTable.end()) {
        cout << "File found: " << fileName << endl;
    } else {
        cout << "File not found: " << fileName << endl;
    }
}

void searchByFileSize(size_t fileSize) {
    bool found = false;
    for (const auto& entry : fileHashTable) {
        if (entry.second.size == fileSize) {
            cout << "File found: " << entry.first << endl;
            found = true;
        }
    }
    if (!found) {
        cout << "No file found with size " << fileSize << " bytes" << endl;
    }
}

void searchByFileExtension(const string& fileExtension) {
    bool found = false;
    for (const auto& entry : fileHashTable) {
        if (entry.second.extension == fileExtension) {
            cout << "File found: " << entry.first << endl;
            found = true;
        }
    }
    if (!found) {
        cout << "No file found with extension ." << fileExtension << endl;
    }
}

void showAllFiles() {
    cout << "List of files:" << endl;
    for (const auto& entry : fileHashTable) {
        cout << entry.first << endl;
    }
}

int main() {
    int choice;
    string fileName, content, fileExtension;
    size_t fileSize;

    cout << "File Management System" << endl;

    while (true) {
        cout << "1. Create File" << endl;
        cout << "2. Write to File" << endl;
        cout << "3. Read from File" << endl;
        cout << "4. Delete File" << endl;
        cout << "5. Search File" << endl;
        cout << "6. Show All Files" << endl;
        cout << "7. Exit" << endl;
        cout << "Enter your choice: ";
        cin >> choice;

        switch (choice) {
            case 1:
                cout << "Enter file name to create: ";
                cin >> fileName;
                createFile(fileName);
                break;
            case 2:
                cout << "Enter file name to write: ";
                cin >> fileName;
                writeFile(fileName);
                break;
            case 3:
                cout << "Enter file name to read: ";
                cin >> fileName;
                readFile(fileName);
                break;
            case 4:
                cout << "Enter file name to delete: ";
                cin >> fileName;
                deleteFile(fileName);
                break;
            case 5:
                searchFile();
                break;
            case 6:
                showAllFiles();
                break;
            case 7:
                cout << "Exiting..." << endl;
                return 0;
            default:
                cout << "Invalid choice" << endl;
                break;
        }
    }

    return 0;
}
