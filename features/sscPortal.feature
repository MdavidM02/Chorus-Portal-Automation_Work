@regression 
Feature: Chorus SS&C - Process Regression Suite

@regression-scenario1
 Scenario: User launch SSC Portal and create a new worklist and open it
  Given I launch the Chorus portal for "TestCase1"
  When I login with username and password for "TestCase1"
  And I create a new worklist
  Then I select following options in the new worklist for "TestCase1"
  When I double click to open the created work item for "TestCase1"
  Then I enter the email and complete the work for "TestCase1"

@regression-scenario2
 Scenario: User launch SSC Portal and open a word document
  Given I launch the Chorus portal for "TestCase2"
   When I login with username and password for "TestCase2"
   And I create a new worklist
   Then I select following options in the new worklist for "TestCase2"
   When I double click to open the created work item for "TestCase2"
   Then I enter the Email and proceed to work for "TestCase2"
   And I accept the pop up in chrome dialog to open MS Word
   Then I click Next button in the MS Word opened

@regression-scenario3
 Scenario: User launch SSC Portal and open the first work item
  Given I launch the Chorus portal for "TestCase3"
   When I login with username and password for "TestCase3"
   And I double click to open the first work item for "TestCase3"

 @regression-scenario4 
 Scenario: User creates business flow for AUTOTEST 3 process
  Given I launch the Chorus portal for "TestCase4"
  When I login with username and password for "TestCase4"
  And I create a new worklist
  Then I select following options in the new worklist for "TestCase4"
  When I double click to open the created work item for "TestCase4"
  And I wait for table data to be displayed
  When I add a new record to EmpTable1 for "TestCase4"
  When I add a new record to EmpTable2 for "TestCase4"
  And I select newly created record for "TestCase4"
  And I click submit button to complete the entry

@regression-scenario5
 Scenario: User creates business flow for AUTOTEST 4 process
  Given I launch the Chorus portal for "TestCase5"
  When I login with username and password for "TestCase5"
  And I create a new worklist
  Then I select following options in the new worklist for "TestCase5"
  When I double click to open the created work item for "TestCase5"
  And I wait for table data to be displayed
  When I select records from the two tables
  And I click submit button to complete the entry

@regression-scenario6
 Scenario: Employer Onboarding Process - Positive Scenario
  Given I launch the Chorus portal
  When I login with username and password
  And I create a new lunate worklist
  Then I select different options in the new worklist
  Then I double click to open the created work item
  Then I close the worklist.
  Then I lock the worklist and then open the worklist
  Then I click Yes and click on Next Step
  Then Give Employer Name and Details and click on Next Step
  Then Complete Employer Onboarding form Click OK and select Next
  Then Review KYC Documents prior to Employer Registration , click Yes and Next
  Then from Onboarding task, search for Parents and Open the Lunate Case
  Then Lock the Employee Onboard Work Item and Move the Work Item to Completed.
  Then Click to Open up the Completed Work Item
  Then Click on Refresh Lunate Case and Close it
  Then I create a new worklist with Work Type as ERONBOARD and Status as ONBOARDPCK
  Then I DoubleClick to Open it and Lock it.
  Then Click Add To Query and Click Search to find the Object Key
  Then Paste the Object Key and Link it.
  Then Click Next and Check employer details created on Percana
  Then Click Yes to Question of Good Order and Enter Comments
  Then Get the Object Key and open up a new Processor screen login as a new user. 
  Then Click on Search Retrieve Object and provide the Key.
  Then Open up the activity which has KYC Docs Review activity
  Then Click Ok on the review and quality check if KYC documents are ready to refer to GHAF Benefits
  Then Pass the Quality Decision and Click on Refresh
  Then Login back as the original user select the Key
  Then Work Item has now passed the quality check and Send an email to GHAF Benefits
  Then Click Lock and Write an email outside of Chorus and click Next
  Then Lock the work item and select Approved for GHAF Benefits and click Next
  Then Create plan on Percana
  Then Open Work item and move to Completed

@regression-scenario7
 Scenario: Employer Onboarding Process -  Negative Scenario
  Given I launch the Chorus portal
  When I login with username and password
  And I create a new lunate worklist
  Then I select different options in the new worklist
  Then I double click to open the created work item
  Then I close the worklist.
  Then I lock the worklist and then open the worklist
  Then I click Yes and click on Next Step
  Then Give Employer Name and Details and click on Next Step
  Then Complete Employer Onboarding form Click OK and select Next
  Then Review KYC Documents prior to Employer Registration , click Yes and Next
  Then from Onboarding task, search for Parents and Open the Lunate Case
  Then Lock the Employee Onboard Work Item and Move the Work Item to Completed.
  Then Click to Open up the Completed Work Item
  Then Click on Refresh Lunate Case and Close it
  Then I create a new worklist with Work Type as ERONBOARD and Status as ONBOARDPCK
  Then I DoubleClick to Open it and Lock it.
  Then Click Add To Query and Click Search to find the Object Key
  Then Paste the Wrong Object Key and Link it.