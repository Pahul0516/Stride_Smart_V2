class Account:
    def __init__(self,userName,email,password,type):
        self.__userName=userName
        self.__email=email
        self.__password=password
        self.__type=type
        self.__id=0
        self.__points=0
        
    def getId(self):
        return self.__id
    
    def setId(self,id):
        self.__id=id

    def getUserName(self):
        return self.__userName
    
    def getEmail(self):
        return self.__email
    
    def getPassword(self):
        return self.__password
    
    def getType(self):
        return self.__type
    
    def setUserName(self,userName):
        self.__userName=userName

    def setType(self,type):
        self.__type=type

    def setEmail(self,email):
        self.__email=email
    
    def setPassword(self,password):
        self.__password=password

    def __eq__(self,account):
        return self.__email==account.__email