# Instalacija podatkovne baze POSTGREs
### 1. Naloži postgres
### 2. V terminalu pojedi v default postgres račun:
    `sudo psql -U postgres`
    geslo:  postgres
### 3. ustvari vlogo admin z geslom admin:
    `CREATE ROLE admin LOGIN password 'admin';`
### 4. Ustvari podatkovno bato EventEaseDB z ownerjem admin 
    `CREATE DATABASE eventeasedb ENCODING 'UTF8' OWNER admin;`
### 5. Prestavi v mapo backend/database in poženi:
    `sudo psql -U admin -d eventeasedb < podatkovna_shema.sql`
    
### 6. 👍


## Preveri če dela
### 1. Logi se in v podatkovno bazo:
    `psql -U admin -d eventeasedb`
### 2. Listi vse tabele:
    `\dt`
    
### 3. Izpis naj bi izgledal tako:
            List of relations
    Schema |     Name     | Type  | Owner 
    --------+--------------+-------+-------
    public | polls        | table | admin
    public | time_slots   | table | admin
    public | vote_options | table | admin
    public | votes        | table | admin
    (4 rows)
    
### 4. 👍 glhf

