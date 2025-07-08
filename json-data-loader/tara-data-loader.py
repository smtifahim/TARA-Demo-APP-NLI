# This script assumes that the stardog server is running. The python code runs all the necessary SPARQL queries
# for the TARA Article Search web application and saves the results in corresponing json files. 
# (version: 1.0; @Author: Fahim Imam)

import stardog
import json
import os

# Stardog DB connection details using stradog cloud endpoint
conn_details = {
                'endpoint': 'https://sd-c1e74c63.stardog.cloud:5820',
                'username': 'TARA',
                'password': os.getenv("STARDOG_TARA_PASSWORD")
               }

db_name = 'TARA-Acupoints'

# File locations for the queries needed for the TARA app
query_files = [
                './sparql-queries/article-data.rq',
                './sparql-queries/acupoints-synonyms.rq',
                './sparql-queries/meridians-synonyms.rq',
                './sparql-queries/anatomical-synonyms.rq',
                './sparql-queries/body-regions-synonyms.rq',
                './sparql-queries/conditions-synonyms.rq'
              ]

# File locations for the generated query results in json format
generated_files = [
                    '../json/article-data.json',
                    '../json/acupoints-synonyms.json',
                    '../json/meridians-synonyms.json',
                    '../json/anatomical-synonyms.json',
                    '../json/body-regions-synonyms.json',
                    '../json/conditions-synonyms.json'
                  ]

def checkServerStatus(admin):
    if (admin.healthcheck()):
        print ("        Server Status: Stardog server is running and able to accept traffic.")
    else:
        print ("        Server Status: Stardog server is NOT running. Please start the server and try again.")
        exit();

print ("\nProgram execution started...")
with stardog.Admin(**conn_details) as admin:  
    print ("\nStep 0: Checking Stardog server status..")
    checkServerStatus(admin)
    print ("Step 0: Done!")

with stardog.Connection(db_name, **conn_details) as conn: 
    for i, query_file in enumerate (query_files):
        print ("\nStep " + str(i+1) + ": Executing query from: " + query_file)
        with open(query_file, 'r') as file:
            query = file.read()
            result = conn.select(query, reasoning=False)
        print ("        Saving query results...")
        with open(generated_files[i], 'w') as file:
            json.dump(result, file, indent=2)
        print ("        Query results saved to: " + generated_files[i])
        print ("Step " + str(i+1) + ": Done!")
    conn.close()
print ("\nAll queries executed and results are saved successfully!\n")
